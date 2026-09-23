"""Consultas del proveedor identificado por la sesión actual."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Response
from google.cloud import firestore

from app.database import get_db
from app.models.farm import FarmResponse
from app.models.provider import Provider
from app.routers.auth import require_provider

router = APIRouter(prefix="/providers/me", tags=["Parcelas del proveedor"])
logger = logging.getLogger(__name__)


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
