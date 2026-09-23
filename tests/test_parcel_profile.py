import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from google.api_core.exceptions import AlreadyExists
from pydantic import ValidationError

from app.main import app
from app.database import get_db
from app.models.farm import FarmCreate, FarmResponse
from app.models.provider import Provider
from app.services import geocoding
from scripts.seed_demo import demo_records, seed_demo


@pytest.fixture
def farm():
    return demo_records()[1][2].copy()


@pytest.fixture
def api():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    with patch("app.routers.farms.enrich_location", new_callable=AsyncMock) as enrich:
        with TestClient(app) as client:
            yield client, db, enrich
    app.dependency_overrides.clear()


def test_profile_defaults_and_validation(farm):
    old = {k: farm[k] for k in ("farmId", "nombre", "geojson", "fechaCreacion")}
    assert FarmResponse(**old).productor is None
    assert FarmResponse(**old).esDemostracion is False
    assert FarmCreate(nombre="Parcela", geojson=farm["geojson"], ciudad="  ").ciudad is None
    with pytest.raises(ValidationError):
        FarmCreate(nombre="Parcela", geojson=farm["geojson"], historia="x" * 5001)
    with pytest.raises(ValidationError):
        Provider(providerId="bad/id", nombrePublico="Demo", fechaCreacion="2026-09-01")


def test_extended_create_and_missing_provider(api, farm):
    client, db, enrich = api
    response = client.post("/farms", json=farm)
    assert response.status_code == 201
    assert response.json()["productor"] == farm["productor"]
    assert "providerId" not in response.json()
    saved = db.collection.return_value.document.return_value.set.call_args.args[0]
    assert saved["providerId"] == farm["providerId"]
    assert saved["geojson"] == farm["geojson"]
    enrich.assert_awaited_once()
    db.reset_mock()
    db.collection.return_value.document.return_value.get.return_value.exists = False
    assert client.post("/farms", json=farm).status_code == 422
    db.collection.return_value.document.return_value.set.assert_not_called()


def test_public_reads_are_read_only_and_private_fields_hidden(api, farm):
    client, db, enrich = api
    farm.update({"email": "private@example.com", "telefono": "private"})
    snapshot = MagicMock(exists=True)
    snapshot.to_dict.return_value = farm
    db.collection.return_value.document.return_value.get.return_value = snapshot
    db.collection.return_value.order_by.return_value.stream.return_value = [snapshot]
    for url in ("/farms", "/farms/demo-farm-001"):
        response = client.get(url)
        assert response.status_code == 200
        data = response.json()[0] if isinstance(response.json(), list) else response.json()
        assert data["geojson"] == farm["geojson"]
        assert data["esDemostracion"] is True
        assert not {"email", "telefono", "providerId"} & data.keys()
    enrich.assert_not_called()
    db.collection.return_value.document.return_value.set.assert_not_called()
    snapshot.exists = False
    assert client.get("/farms/missing").status_code == 404


def test_legacy_detail(api, farm):
    client, db, _ = api
    old = {k: farm[k] for k in ("farmId", "nombre", "geojson", "fechaCreacion")}
    db.collection.return_value.document.return_value.get.return_value.to_dict.return_value = old
    data = client.get("/farms/legacy").json()
    assert all(data[k] == v for k, v in old.items())
    assert data["pais"] is None


def test_location_preserves_manual_values(farm):
    farm.update(dict.fromkeys(geocoding.LOCATION_FIELDS))
    farm["pais"] = "País proporcionado"
    with patch.object(geocoding, "reverse_geocode", new=AsyncMock(return_value={"pais": "Otro", "estado": "Estado"})):
        asyncio.run(geocoding.enrich_location(farm))
    assert farm["pais"] == "País proporcionado"
    assert farm["estado"] == "Estado"
    assert farm["municipio"] is None
    assert farm["ubicacionAtribucion"] == geocoding.ATTRIBUTION


def test_complete_location_skips_service(farm):
    farm.update(dict.fromkeys(geocoding.LOCATION_FIELDS, "Manual"))
    with patch.object(geocoding, "reverse_geocode", new_callable=AsyncMock) as reverse:
        asyncio.run(geocoding.enrich_location(farm))
    reverse.assert_not_called()


def test_creation_survives_geocoder_timeout(monkeypatch, farm):
    db = MagicMock()
    monkeypatch.setattr(geocoding.settings, "GEOCODING_ENABLED", True)
    monkeypatch.setattr(geocoding, "_cache", geocoding.OrderedDict())
    monkeypatch.setattr(geocoding, "_lock", asyncio.Lock())
    monkeypatch.setattr(geocoding, "_last_request", 0)
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch.object(geocoding.httpx, "AsyncClient") as factory:
            factory.return_value.__aenter__.return_value.get.side_effect = httpx.ReadTimeout("timeout")
            with TestClient(app) as client:
                response = client.post("/farms", json={"nombre": farm["nombre"], "geojson": farm["geojson"]})
        assert response.status_code == 201
        assert response.json()["pais"] is None
        db.collection.return_value.document.return_value.set.assert_called_once()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("mode", ["success", "timeout", "http_error", "invalid_json", "invalid_address"])
def test_reverse_service(monkeypatch, farm, mode):
    monkeypatch.setattr(geocoding.settings, "GEOCODING_ENABLED", True)
    monkeypatch.setattr(geocoding, "_cache", geocoding.OrderedDict())
    monkeypatch.setattr(geocoding, "_lock", asyncio.Lock())
    monkeypatch.setattr(geocoding, "_last_request", 0)
    response = MagicMock()
    response.json.return_value = {"address": {"town": "Localidad", "county": "No inferir municipio", "country": "México"}}
    if mode == "http_error":
        response.raise_for_status.side_effect = httpx.HTTPError("fallo")
    if mode == "invalid_json":
        response.json.side_effect = ValueError("JSON inválido")
    if mode == "invalid_address":
        response.json.return_value = {"address": []}
    client = AsyncMock()
    client.get.return_value = response
    if mode == "timeout":
        client.get.side_effect = httpx.ReadTimeout("timeout")
    with patch.object(geocoding.httpx, "AsyncClient") as factory:
        factory.return_value.__aenter__.return_value = client
        result = asyncio.run(geocoding.reverse_geocode(farm["geojson"]))
        if mode == "success":
            assert result == {"ciudad": "Localidad", "pais": "México"}
            assert asyncio.run(geocoding.reverse_geocode(farm["geojson"])) == result
            client.get.assert_awaited_once()
        else:
            assert result == {}


def test_disabled_and_invalid_geometry(monkeypatch, farm):
    monkeypatch.setattr(geocoding.settings, "GEOCODING_ENABLED", False)
    with patch.object(geocoding.httpx, "AsyncClient") as client:
        assert asyncio.run(geocoding.reverse_geocode(farm["geojson"])) == {}
        monkeypatch.setattr(geocoding.settings, "GEOCODING_ENABLED", True)
        assert asyncio.run(geocoding.reverse_geocode({})) == {}
        client.assert_not_called()


def test_seed_repeat_and_collision():
    db = MagicMock()
    storage = {}

    def collection(name):
        col = MagicMock()

        def document(identifier):
            ref = MagicMock()
            key = (name, identifier)

            def create(data):
                if key in storage:
                    raise AlreadyExists("exists")
                storage[key] = data

            ref.create.side_effect = create
            ref.get.return_value.to_dict.side_effect = lambda: storage[key]
            return ref

        col.document.side_effect = document
        return col

    db.collection.side_effect = collection
    assert seed_demo(db) == 3
    assert seed_demo(db) == 0
    storage[("providers", "demo-provider-001")] = {"nombrePublico": "Real"}
    with pytest.raises(RuntimeError, match="Colisión"):
        seed_demo(db)
    assert storage[("providers", "demo-provider-001")] == {"nombrePublico": "Real"}
