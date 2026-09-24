"""Geometría de consulta; no ejecuta índices ni escribe resultados."""
import ee
from app.services.earth_engine import initialize_earth_engine


def get_buffer_geometry(geojson: dict) -> dict:
    initialize_earth_engine()
    geometry = geojson.get('geometry') if geojson.get('type') == 'Feature' else geojson
    farm = ee.Geometry(geometry)
    # Mismas operaciones y tolerancia del motor existente, sin modificarlo.
    return farm.buffer(500).difference(farm, maxError=1).getInfo()
