"""Consultas del proveedor identificado por la sesión actual."""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from google.cloud import firestore

from app.database import get_db
from app.models.farm import FarmCreate, FarmResponse, FarmVisibilityUpdate
from app.models.provider import Provider
from app.routers.auth import require_provider
from app.services.geocoding import enrich_location

router = APIRouter(prefix="/providers/me", tags=["Parcelas del proveedor"])
logger = logging.getLogger(__name__)


@router.patch("/farms/{farm_id}/visibility", response_model=FarmResponse)
def update_visibility(farm_id: str, update: FarmVisibilityUpdate, response: Response,
                      provider: Provider = Depends(require_provider), db: firestore.Client = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    try:
        ref = db.collection("farms").document(farm_id)
        doc = ref.get()
        data = doc.to_dict() if doc.exists else None
        if not data or data.get("providerId") != provider.providerId:
            raise HTTPException(404, "Parcela no encontrada.")
        # Impide cambiar una parcela cuya propiedad/version haya cambiado tras la lectura.
        ref.update({"visible": update.visible}, option=firestore.LastUpdateOption(doc.update_time))
        return FarmResponse(**{**data, "visible": update.visible})
    except HTTPException:
        raise
    except Exception:
        logger.exception("No se pudo actualizar la visibilidad")
        raise HTTPException(503, "No se pudo confirmar el cambio de visibilidad. Recarga Mis parcelas.")


@router.post("/farms", response_model=FarmResponse, status_code=201)
async def create_provider_farm(farm: FarmCreate, provider: Provider = Depends(require_provider),
                               db: firestore.Client = Depends(get_db)):
    # La identidad viene exclusivamente de la sesión, no del formulario.
    data = {**farm.model_dump(), "providerId": provider.providerId,
            "farmId": str(uuid.uuid4()), "fechaCreacion": datetime.now(timezone.utc).isoformat(),
            "esDemostracion": provider.esDemostracion}
    await enrich_location(data)
    try:
        db.collection("farms").document(data["farmId"]).set(data)
    except Exception:
        logger.exception("No se pudo guardar la parcela del proveedor")
        raise HTTPException(503, "No se pudo confirmar el guardado. Revisa Mis parcelas antes de reintentar.")
    return FarmResponse(**data)


@router.get("/farms", response_model=list[FarmResponse])
def list_provider_farms(response: Response, provider: Provider = Depends(require_provider),
                        db: firestore.Client = Depends(get_db)):
    response.headers["Cache-Control"] = "no-store"
    try:
        docs = db.collection("farms").where(
            filter=firestore.FieldFilter("providerId", "==", provider.providerId)
        ).stream()
        records = []
        for doc in docs:
            data = doc.to_dict() if doc.exists else None
            if data and data.get("providerId") == provider.providerId:
                records.append(FarmResponse(**data))
        # Evita requerir un índice compuesto y conserva registros con campos nuevos ausentes.
        records.sort(key=lambda farm: farm.fechaCreacion, reverse=True)
        return records
    except Exception:
        logger.exception("No se pudieron consultar las parcelas del proveedor")
        raise HTTPException(503, "No se pudieron consultar tus parcelas. Inténtalo de nuevo.")
