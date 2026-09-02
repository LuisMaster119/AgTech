"""Servicio de integración con Google Earth Engine para análisis satelital multitemporal (Sentinel-2)."""

import logging
import os
from datetime import date, timedelta
from typing import Dict, Any, Tuple
import ee
from app.config import settings
from app.models.analysis import DateRange, SpectralIndices

logger = logging.getLogger("agtech.earth_engine")

_ee_initialized = False


def initialize_earth_engine():
    """Inicializa la API de Earth Engine usando Application Default Credentials (ADC)."""
    global _ee_initialized
    if not _ee_initialized:
        logger.info("Inicializando conexión con Google Earth Engine...")
        try:
            # Inicializar con credenciales del entorno
            ee.Initialize()
            _ee_initialized = True
            logger.info("Google Earth Engine inicializado exitosamente.")
        except Exception as e:
            logger.warning(f"No se pudo inicializar EE con Initialize estándar ({e}), intentando con autenticación explícita...")
            try:
                # Intento alternativo si se requiere proyecto explícito
                ee.Initialize(project=os.environ.get("GOOGLE_CLOUD_PROJECT", "AgTech"))
                _ee_initialized = True
                logger.info("Google Earth Engine inicializado con proyecto explícito.")
            except Exception as e2:
                logger.error(f"Error crítico al inicializar Google Earth Engine: {e2}")
                raise RuntimeError(f"Error de autenticación con Google Earth Engine: {e2}")


def mask_s2_clouds(image: ee.Image) -> ee.Image:
    """Aplica máscara de nubes y sombras para la colección Sentinel-2 SR usando la banda SCL (Scene Classification Layer)

    y QA60 como respaldo.
    """
    # SCL Classes: 3=cloud shadow, 8=cloud medium prob, 9=cloud high prob, 10=thin cirrus, 11=snow
    scl = image.select("SCL")
    scl_mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    
    # QA60 Bitmask como capa adicional: Bit 10 = Opaque clouds, Bit 11 = Cirrus clouds
    qa = image.select("QA60")
    cloud_bit_mask = 1 << 10
    cirrus_bit_mask = 1 << 11
    qa_mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
    
    return image.updateMask(scl_mask.And(qa_mask))


def compute_spectral_indices(image: ee.Image) -> ee.Image:
    """Calcula las capas de índices espectrales NDVI, NDMI y NDBI a partir de las bandas Sentinel-2.

    - NDVI = (B8 - B4) / (B8 + B4)      [NIR y Rojo] -> Salud y densidad vegetal
    - NDMI = (B8 - B11) / (B8 + B11)    [NIR y SWIR1] -> Contenido de humedad en la vegetación
    - NDBI = (B11 - B8) / (B11 + B8)    [SWIR1 y NIR] -> Suelo desnudo / degradación
    """
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("ndvi")
    ndmi = image.normalizedDifference(["B8", "B11"]).rename("ndmi")
    ndbi = image.normalizedDifference(["B11", "B8"]).rename("ndbi")
    
    return image.addBands([ndvi, ndmi, ndbi])


def get_period_composite(
    geometry: ee.Geometry,
    start_date: str,
    end_date: str,
    max_cloud_percentage: float = 20.0
) -> ee.Image:
    """Obtiene el compuesto multiespectral Sentinel-2 libre de nubes (mediana temporal) para un rango de fechas."""
    collection = (
        ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(geometry)
        .filterDate(start_date, end_date)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_percentage))
    )
    
    # Comprobar si hay imágenes disponibles en el periodo; si la colección tiene pocas, relajamos temporalmente el filtro
    count = collection.size().getInfo()
    if count == 0:
        logger.warning(f"No se encontraron imágenes con nubosidad < {max_cloud_percentage}% entre {start_date} y {end_date}. Relajando filtro de nubosidad a 40%...")
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 40.0))
        )
    
    masked_collection = collection.map(mask_s2_clouds)
    composite = masked_collection.median()
    return compute_spectral_indices(composite)


def extract_zonal_means(image: ee.Image, farm_geom: ee.Geometry, buffer_geom: ee.Geometry) -> SpectralIndices:
    """Calcula el promedio zonal de NDVI, NDMI y NDBI para el polígono de la granja y el buffer de 500m."""
    # Reducción espacial para la granja (escala 10m correspondiente a la resolución nativa de Sentinel-2 B4/B8)
    farm_stats = image.select(["ndvi", "ndmi", "ndbi"]).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=farm_geom,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    # Reducción espacial para el buffer circundante de 500m
    buffer_stats = image.select(["ndvi", "ndmi", "ndbi"]).reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=buffer_geom,
        scale=10,
        maxPixels=1e9
    ).getInfo()

    def safe_float(val: Any, default: float = 0.0) -> float:
        if val is None:
            return default
        try:
            return round(float(val), 4)
        except (ValueError, TypeError):
            return default

    return SpectralIndices(
        ndvi_granja=safe_float(farm_stats.get("ndvi"), 0.0),
        ndvi_buffer=safe_float(buffer_stats.get("ndvi"), 0.0),
        ndmi_granja=safe_float(farm_stats.get("ndmi"), 0.0),
        ndmi_buffer=safe_float(buffer_stats.get("ndmi"), 0.0),
        ndbi_granja=safe_float(farm_stats.get("ndbi"), 0.0),
        ndbi_buffer=safe_float(buffer_stats.get("ndbi"), 0.0),
    )


def default_date_ranges() -> Tuple[DateRange, DateRange]:
    """Genera rangos de fechas por defecto:

    - Periodo reciente: últimos 6 meses a la fecha actual
    - Periodo de referencia: misma ventana estacional de 6 meses pero hace 2 años (~730 días)
    """
    today = date.today()
    reciente_fin = today.isoformat()
    reciente_inicio = (today - timedelta(days=180)).isoformat()
    
    # Referencia histórica de 2 años atrás (365 * 2 = 730 días)
    ref_fin = (today - timedelta(days=730)).isoformat()
    ref_inicio = (today - timedelta(days=730 + 180)).isoformat()

    return (
        DateRange(inicio=reciente_inicio, fin=reciente_fin),
        DateRange(inicio=ref_inicio, fin=ref_fin)
    )


def analyze_farm_satellite_data(
    farm_geojson: Dict[str, Any],
    periodo_reciente: DateRange | None = None,
    periodo_referencia: DateRange | None = None
) -> Tuple[SpectralIndices, SpectralIndices, DateRange, DateRange]:
    """Ejecuta el pipeline completo de análisis satelital en Google Earth Engine para una granja y su entorno circundante."""
    initialize_earth_engine()

    # Si no se proveen rangos, calcular defaults (reciente: últimos 6 meses, referencia: hace 2 años)
    default_rec, default_ref = default_date_ranges()
    p_rec = periodo_reciente if periodo_reciente is not None else default_rec
    p_ref = periodo_referencia if periodo_referencia is not None else default_ref

    # 1. Crear geometrías en Earth Engine
    # Polígono de la granja
    if farm_geojson.get("type") == "Feature":
        geom_dict = farm_geojson.get("geometry")
    else:
        geom_dict = farm_geojson
    
    farm_geom = ee.Geometry(geom_dict)
    
    # Buffer anular de 500m: buffer_total (500m) - área de la granja
    buffer_total = farm_geom.buffer(500)
    buffer_geom = buffer_total.difference(farm_geom, maxError=1)

    # 2. Generar compuesto multiespectral para el Periodo Reciente
    logger.info(f"Generando compuesto Sentinel-2 para periodo reciente: {p_rec.inicio} a {p_rec.fin}")
    composite_reciente = get_period_composite(buffer_total, p_rec.inicio, p_rec.fin)
    indices_reciente = extract_zonal_means(composite_reciente, farm_geom, buffer_geom)

    # 3. Generar compuesto multiespectral para el Periodo de Referencia
    logger.info(f"Generando compuesto Sentinel-2 para periodo de referencia: {p_ref.inicio} a {p_ref.fin}")
    composite_referencia = get_period_composite(buffer_total, p_ref.inicio, p_ref.fin)
    indices_referencia = extract_zonal_means(composite_referencia, farm_geom, buffer_geom)

    return indices_reciente, indices_referencia, p_rec, p_ref
