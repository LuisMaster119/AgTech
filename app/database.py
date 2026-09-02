import logging
from google.cloud import firestore
from app.config import settings

logger = logging.getLogger("agtech.database")

_db_client: firestore.Client | None = None


def get_db() -> firestore.Client:
    """Obtiene o inicializa el cliente singleton de Firestore apuntando a la base de datos configurada."""
    global _db_client
    if _db_client is None:
        logger.info(f"Inicializando cliente de Firestore para base de datos: '{settings.FIRESTORE_DATABASE_ID}'")
        # Se utiliza Application Default Credentials (ADC) automáticamente
        _db_client = firestore.Client(database=settings.FIRESTORE_DATABASE_ID)
    return _db_client
