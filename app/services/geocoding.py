"""Enriquecimiento opcional de ubicación, separado del análisis ambiental."""
import asyncio
import logging
import math
import time
from collections import OrderedDict

import httpx

from app.config import settings

logger = logging.getLogger(__name__)
LOCATION_FIELDS = ("ciudad", "municipio", "estado", "pais")
ATTRIBUTION = "© OpenStreetMap contributors (ODbL)"
_lock = asyncio.Lock()
_last_request = 0.0
_cache = OrderedDict()


def representative_point(geometry):
    """Usa un vértice del perímetro; no inventa un centro fuera de polígonos cóncavos."""
    try:
        lon, lat = geometry["coordinates"][0][0][:2]
        if all(math.isfinite(v) for v in (lon, lat)) and -180 <= lon <= 180 and -90 <= lat <= 90:
            return lon, lat
    except (KeyError, IndexError, TypeError, ValueError):
        pass
    return None


async def reverse_geocode(geometry):
    global _last_request
    point = representative_point(geometry)
    if not settings.GEOCODING_ENABLED or point is None:
        return {}
    key = (settings.GEOCODING_URL, *point)
    async with _lock:
        if key in _cache:
            return dict(_cache[key])
        # Límite por proceso. El servicio público requiere un único worker.
        await asyncio.sleep(max(0, 1.0 - (time.monotonic() - _last_request)))
        _last_request = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=settings.GEOCODING_TIMEOUT_SECONDS) as client:
                response = await client.get(
                    settings.GEOCODING_URL,
                    params={"lon": point[0], "lat": point[1], "format": "jsonv2", "addressdetails": 1},
                    headers={"User-Agent": settings.GEOCODING_USER_AGENT, "Accept-Language": "es"},
                )
                response.raise_for_status()
                payload = response.json()
                address = payload.get("address", {}) if isinstance(payload, dict) else {}
                if not isinstance(address, dict):
                    return {}
                # No equiparar county con municipio: varía según el país.
                mapping = {"ciudad": ("city", "town", "village"), "municipio": ("municipality",),
                           "estado": ("state",), "pais": ("country",)}
                result = {}
                for field, keys in mapping.items():
                    for source in keys:
                        value = address.get(source)
                        if isinstance(value, str) and value.strip() and len(value.strip()) <= 150:
                            result[field] = value.strip()
                            break
                _cache[key] = result
                if len(_cache) > 256:
                    _cache.popitem(last=False)
                return dict(result)
        except (httpx.HTTPError, ValueError):
            logger.warning("Geocodificación no disponible; se conserva ubicación parcial.")
            return {}


async def enrich_location(farm_data):
    if all(farm_data.get(field) for field in LOCATION_FIELDS):
        return
    location = await reverse_geocode(farm_data["geojson"])
    changed = False
    for field in LOCATION_FIELDS:
        if not farm_data.get(field) and location.get(field):
            farm_data[field] = location[field]
            changed = True
    if changed:
        farm_data["ubicacionAtribucion"] = ATTRIBUTION
