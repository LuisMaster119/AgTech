import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from google.cloud import firestore

from app.database import get_db
from app.models.farm import FarmCreate, FarmResponse
from app.models.analysis import (
    AnalyzeRequest,
    AnalysisResponse,
    CertificateResponse,
    DateRange,
    SpectralIndices,
    DeltaIndices,
    MetricEvaluation,
    RiskLevel,
)
from app.services.earth_engine import analyze_farm_satellite_data
from app.services.scoring import calculate_ecological_score
from app.services.geocoding import enrich_location

logger = logging.getLogger("agtech.routers.farms")

router = APIRouter(prefix="/farms", tags=["Granjas y Análisis"])


@router.post(
    "",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una nueva granja",
    description="Crea un nuevo registro de granja con su nombre y geometría poligonal GeoJSON en Firestore."
)
async def create_farm(
    farm_in: FarmCreate,
    db: firestore.Client = Depends(get_db)
):
    farm_id = str(uuid.uuid4())
    fecha_creacion = datetime.now(timezone.utc).isoformat()

    farm_data = {
        **farm_in.model_dump(),
        "farmId": farm_id,
        "nombre": farm_in.nombre,
        "geojson": farm_in.geojson,
        "fechaCreacion": fecha_creacion
    }

    if farm_in.providerId is not None:
        provider = db.collection("providers").document(farm_in.providerId).get()
        if not provider.exists:
            raise HTTPException(status_code=422, detail="El proveedor indicado no existe.")
    await enrich_location(farm_data)

    try:
        # Guardar en la colección 'farms' con ID como clave de documento
        db.collection("farms").document(farm_id).set(farm_data)
        logger.info(f"Granja registrada con éxito: {farm_id} ({farm_in.nombre})")
    except Exception as e:
        logger.error(f"Error al escribir en Firestore (farms): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar la granja en Firestore: {str(e)}"
        )

    return FarmResponse(**farm_data)


@router.get(
    "",
    response_model=List[FarmResponse],
    summary="Listar todas las granjas",
    description="Recupera la lista de todas las granjas registradas en Firestore ordenadas cronológicamente."
)
async def list_farms(
    db: firestore.Client = Depends(get_db)
):
    try:
        query = db.collection("farms").order_by("fechaCreacion", direction=firestore.Query.DESCENDING)
        docs = list(query.stream())
    except Exception as e:
        logger.warning(f"Error en consulta ordenada de granjas ({e}), consultando sin orden y ordenando en memoria...")
        docs = list(db.collection("farms").stream())
        docs.sort(key=lambda d: d.to_dict().get("fechaCreacion", ""), reverse=True)

    farms = [FarmResponse(**d.to_dict()) for d in docs if d.exists]
    return farms


@router.get(
    "/{farm_id}",
    response_model=FarmResponse,
    summary="Obtener detalles de una granja",
    description="Consulta la información y polígono de una granja por su ID."
)
async def get_farm(
    farm_id: str,
    db: firestore.Client = Depends(get_db)
):
    doc_ref = db.collection("farms").document(farm_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Granja con ID '{farm_id}' no encontrada."
        )
    return FarmResponse(**doc.to_dict())


@router.post(
    "/{farm_id}/analyze",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Ejecutar análisis de impacto ecológico satelital",
    description="Ejecuta el pipeline de Earth Engine (Sentinel-2) para la granja y su buffer de 500m, calculando NDVI, NDMI y NDBI, deltas y score de riesgo, guardando el resultado en Firestore."
)
async def analyze_farm(
    farm_id: str,
    request: Optional[AnalyzeRequest] = None,
    db: firestore.Client = Depends(get_db)
):
    # 1. Verificar existencia de la granja
    doc_ref = db.collection("farms").document(farm_id)
    farm_doc = doc_ref.get()
    if not farm_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Granja con ID '{farm_id}' no encontrada. Regístrela primero con POST /farms."
        )
    
    farm_data = farm_doc.to_dict()
    farm_geojson = farm_data.get("geojson")

    periodo_rec = request.periodoReciente if request else None
    periodo_ref = request.periodoReferencia if request else None

    # 2. Ejecutar análisis multiespectral en Earth Engine
    try:
        logger.info(f"Iniciando procesamiento satelital Earth Engine para granja {farm_id}...")
        indices_rec, indices_ref, p_rec, p_ref = analyze_farm_satellite_data(
            farm_geojson=farm_geojson,
            periodo_reciente=periodo_rec,
            periodo_referencia=periodo_ref
        )
    except Exception as e:
        logger.error(f"Error durante el procesamiento satelital en Earth Engine: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al procesar imágenes satelitales en Google Earth Engine: {str(e)}"
        )

    # 3. Calcular Score Ecológico y desglose explicable
    deltas, score, nivel_riesgo, desglose, resumen = calculate_ecological_score(
        reciente=indices_rec,
        referencia=indices_ref
    )

    # 4. Estructurar y guardar en la colección 'analyses'
    analysis_id = str(uuid.uuid4())
    fecha_creacion = datetime.now(timezone.utc).isoformat()

    analysis_data = {
        "analysisId": analysis_id,
        "farmId": farm_id,
        "periodoReferencia": p_ref.model_dump(),
        "periodoReciente": p_rec.model_dump(),
        "indices": {
            "reciente": indices_rec.model_dump(),
            "referencia": indices_ref.model_dump()
        },
        "deltas": deltas.model_dump(),
        "score": score,
        "nivelRiesgo": nivel_riesgo.value,
        "desglose": [d.model_dump() for d in desglose],
        "resumenEjecutivo": resumen,
        "fechaCreacion": fecha_creacion
    }

    try:
        db.collection("analyses").document(analysis_id).set(analysis_data)
        logger.info(f"Análisis satelital guardado con éxito: {analysis_id} (Granja: {farm_id}, Score: {score})")
    except Exception as e:
        logger.error(f"Error al guardar el análisis en Firestore (analyses): {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar los resultados del análisis en Firestore: {str(e)}"
        )

    return AnalysisResponse(**analysis_data)


@router.get(
    "/{farm_id}/certificate",
    response_model=CertificateResponse,
    summary="Obtener certificado y desglose más reciente",
    description="Recupera el último análisis de pre-evaluación ecológica registrado para la granja con su desglose completo de índices satelitales."
)
async def get_farm_certificate(
    farm_id: str,
    db: firestore.Client = Depends(get_db)
):
    # 1. Verificar si la granja existe
    farm_doc = db.collection("farms").document(farm_id).get()
    if not farm_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Granja con ID '{farm_id}' no encontrada."
        )
    farm_data = farm_doc.to_dict()
    farm_nombre = farm_data.get("nombre", "Granja")

    # 2. Consultar el análisis más reciente para esta granja
    try:
        query = (
            db.collection("analyses")
            .where(filter=firestore.FieldFilter("farmId", "==", farm_id))
            .order_by("fechaCreacion", direction=firestore.Query.DESCENDING)
            .limit(1)
        )
        docs = list(query.stream())
    except Exception as e:
        # Si falta un índice compuesto en Firestore durante la consulta ordenada, intentar consulta simple y orden en memoria
        logger.warning(f"Error en consulta ordenada con índice en Firestore ({e}), realizando filtrado alternativo...")
        query_simple = db.collection("analyses").where(filter=firestore.FieldFilter("farmId", "==", farm_id))
        docs = list(query_simple.stream())
        if docs:
            docs.sort(key=lambda d: d.to_dict().get("fechaCreacion", ""), reverse=True)

    if not docs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se han registrado análisis para la granja '{farm_id}'. Ejecute primero POST /farms/{farm_id}/analyze."
        )

    latest_analysis = docs[0].to_dict()
    latest_analysis["farmNombre"] = farm_nombre

    return CertificateResponse(**latest_analysis)
