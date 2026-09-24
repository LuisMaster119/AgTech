"""Evaluación de completitud independiente del análisis ambiental, sin escrituras."""
from datetime import datetime, timezone
from math import isfinite

from app.models.seal import ProfileCriterion, SealEvaluation


def polygon_has_structure(geometry):
    """Validación estructural, no topológica ni catastral; nunca normaliza datos."""
    if not isinstance(geometry, dict) or geometry.get("type") != "Polygon":
        return False
    rings = geometry.get("coordinates")
    if not isinstance(rings, list) or not rings:
        return False
    for ring in rings:
        if not isinstance(ring, list) or len(ring) < 4:
            return False
        for point in ring:
            if not isinstance(point, list) or len(point) != 2:
                return False
            if any(type(v) not in (int, float) or not isfinite(v) for v in point):
                return False
            if not (-180 <= point[0] <= 180 and -90 <= point[1] <= 90):
                return False
        if ring[0] != ring[-1] or len({tuple(p) for p in ring[:-1]}) < 3:
            return False
        # Evita anillos degenerados; no acredita ausencia de intersecciones.
        origin_x, origin_y = ring[0]
        area = sum((a[0] - origin_x) * (b[1] - origin_y)
                   - (b[0] - origin_x) * (a[1] - origin_y)
                   for a, b in zip(ring, ring[1:]))
        if area == 0:
            return False
    return True


def evaluate_profile(farm_id: str, data: dict) -> SealEvaluation:
    labels = {
        "nombre": "Nombre de parcela", "productor": "Productor",
        "historia": "Historia", "actividadEconomica": "Actividad económica",
        "municipio": "Municipio", "estado": "Estado", "pais": "País",
    }
    criteria = [ProfileCriterion(
        campo=key, descripcion=label,
        cumple=isinstance(data.get(key), str) and bool(data[key].strip()),
    ) for key, label in labels.items()]
    criteria.append(ProfileCriterion(
        campo="geojson", descripcion="Polígono con estructura válida",
        cumple=polygon_has_structure(data.get("geojson")),
    ))
    return SealEvaluation(
        farmId=farm_id, versionCriterios="perfil-base-1.0",
        fechaEvaluacion=datetime.now(timezone.utc).isoformat(),
        esDemostracion=data.get("esDemostracion") is True,
        estado="cumple" if all(c.cumple for c in criteria) else "faltan_datos",
        criterios=criteria,
    )
