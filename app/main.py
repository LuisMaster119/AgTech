import os
import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import farms_router
from app.routers.auth import router as auth_router

# Configuración de logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("agtech.main")

app = FastAPI(
    title="AgTech — Certificación de Impacto Ecológico Satelital",
    description="""
API Backend para la pre-evaluación de impacto ecológico agrícola mediante análisis satelital multitemporal (Sentinel-2 en Google Earth Engine) y almacenamiento en Google Cloud Firestore.

### Capacidades:
* **Registro de Granjas**: Almacena polígonos GeoJSON de predios agrícolas.
* **Pipeline Satelital**: Extrae compuestos de reflectancia de superficie (Sentinel-2) con filtrado de nubes y cálculo de un buffer anular de 500 metros como control ecológico circundante.
* **Índices Espectrales**: Calcula promedios zonales de NDVI (Vegetación), NDMI (Humedad) y NDBI (Suelo Desnudo / Degradación).
* **Scoring Explicable**: Evalúa deltas diferenciales temporales entre la granja y su entorno, emitiendo un score de 0 a 100 y categorización de riesgo (Bajo / Medio / Alto).
* **Certificado de Pre-evaluación**: Genera el desglose técnico auditable para procesos de certificación de exportación.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de rutas
app.include_router(farms_router)
app.include_router(auth_router)


@app.get(
    "/health",
    tags=["Sistema"],
    summary="Verificación de estado del servicio",
    description="Retorna el estado operativo del backend, la base de datos Firestore configurada y el entorno."
)
async def health_check():
    return {
        "status": "healthy",
        "service": "AgTech Satellite Impact Backend",
        "firestore_database": settings.FIRESTORE_DATABASE_ID,
        "version": "1.0.0"
    }


# Montaje de archivos estáticos del frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if not os.path.exists(frontend_dir):
    os.makedirs(frontend_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
