"""Ejecutar con python -m scripts.seed_demo; nunca se carga al iniciar la API."""
from google.api_core.exceptions import AlreadyExists

from app.database import get_db
from app.models.farm import FarmCreate
from app.models.provider import Provider


def demo_records():
    timestamp = "2026-09-01T00:00:00+00:00"
    provider = Provider(providerId="demo-provider-001", nombrePublico="Cooperativa Demo TerraSync",
                        fechaCreacion=timestamp, esDemostracion=True)
    records = [("providers", provider.providerId, provider.model_dump())]
    for index, (name, activity, lon, lat) in enumerate([
        ("Parcela Demo Milpa", "Cultivo de maíz (demostración)", -88.40, 18.70),
        ("Parcela Demo Huerto", "Fruticultura (demostración)", -88.42, 18.72),
    ], start=1):
        farm = FarmCreate(
            nombre=name, providerId=provider.providerId, productor="Productor ficticio TerraSync",
            historia="Perfil ficticio para demostrar el catálogo; no representa una explotación real.",
            actividadEconomica=activity,
            ciudad="Bacalar", municipio="Bacalar", estado="Quintana Roo", pais="México",
            geojson={"type": "Polygon", "coordinates": [[[lon, lat], [lon + .001, lat],
                     [lon + .001, lat + .001], [lon, lat + .001], [lon, lat]]]},
        )
        farm_id = f"demo-farm-{index:03d}"
        records.append(("farms", farm_id, {**farm.model_dump(), "farmId": farm_id,
                       "fechaCreacion": timestamp, "esDemostracion": True}))
    return records


def seed_demo(db):
    created = 0
    for collection, identifier, data in demo_records():
        ref = db.collection(collection).document(identifier)
        try:
            # Creación atómica: nunca reemplazar un documento existente.
            ref.create(data)
            created += 1
        except AlreadyExists:
            existing = ref.get().to_dict() or {}
            if existing != data:
                raise RuntimeError(f"Colisión con documento distinto: {collection}/{identifier}")
    return created


if __name__ == "__main__":
    print(f"Registros demo creados: {seed_demo(get_db())}")
