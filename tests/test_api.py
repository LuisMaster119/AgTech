from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.models.analysis import SpectralIndices, DateRange

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["firestore_database"] == "ag-tech"


def test_static_frontend_served():
    response = client.get("/")
    assert response.status_code == 200
    assert "AgTech" in response.text
    assert "map" in response.text


def test_create_farm_mocked_db():
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_doc = MagicMock()
    mock_db.collection.return_value = mock_collection
    mock_collection.document.return_value = mock_doc

    app.dependency_overrides[get_db] = lambda: mock_db

    payload = {
        "nombre": "Hacienda El Roble",
        "geojson": {
            "type": "Polygon",
            "coordinates": [
                [
                    [-73.50, 5.10],
                    [-73.49, 5.10],
                    [-73.49, 5.09],
                    [-73.50, 5.09],
                    [-73.50, 5.10]
                ]
            ]
        }
    }

    response = client.post("/farms", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["nombre"] == "Hacienda El Roble"
    assert "farmId" in data
    assert "fechaCreacion" in data

    mock_db.collection.assert_called_with("farms")
    mock_doc.set.assert_called_once()
    app.dependency_overrides.clear()


def test_list_farms_mocked_db():
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_query = MagicMock()
    mock_farm_snapshot = MagicMock()

    mock_farm_snapshot.exists = True
    mock_farm_snapshot.to_dict.return_value = {
        "farmId": "farm-123",
        "nombre": "Hacienda El Roble",
        "geojson": {
            "type": "Polygon",
            "coordinates": [
                [[-73.50, 5.10], [-73.49, 5.10], [-73.49, 5.09], [-73.50, 5.09], [-73.50, 5.10]]
            ]
        },
        "fechaCreacion": "2026-09-01T00:00:00Z"
    }

    mock_db.collection.return_value = mock_collection
    mock_collection.order_by.return_value = mock_query
    mock_query.stream.return_value = [mock_farm_snapshot]

    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/farms")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["farmId"] == "farm-123"
    assert data[0]["nombre"] == "Hacienda El Roble"

    app.dependency_overrides.clear()


@patch("app.routers.farms.analyze_farm_satellite_data")
def test_analyze_farm_mocked(mock_ee_analyze):
    mock_db = MagicMock()
    mock_farms_col = MagicMock()
    mock_analyses_col = MagicMock()
    mock_farm_doc = MagicMock()
    mock_farm_snapshot = MagicMock()

    mock_farm_snapshot.exists = True
    mock_farm_snapshot.to_dict.return_value = {
        "farmId": "farm-123",
        "nombre": "Hacienda El Roble",
        "geojson": {
            "type": "Polygon",
            "coordinates": [
                [[-73.50, 5.10], [-73.49, 5.10], [-73.49, 5.09], [-73.50, 5.09], [-73.50, 5.10]]
            ]
        },
        "fechaCreacion": "2026-09-01T00:00:00Z"
    }
    mock_farm_doc.get.return_value = mock_farm_snapshot

    def get_collection(name):
        if name == "farms":
            return mock_farms_col
        elif name == "analyses":
            return mock_analyses_col
        return MagicMock()

    mock_db.collection.side_effect = get_collection
    mock_farms_col.document.return_value = mock_farm_doc

    mock_analysis_doc = MagicMock()
    mock_analyses_col.document.return_value = mock_analysis_doc

    app.dependency_overrides[get_db] = lambda: mock_db

    # Mock Earth Engine Output
    mock_indices_rec = SpectralIndices(
        ndvi_granja=0.72,
        ndvi_buffer=0.68,
        ndmi_granja=0.38,
        ndmi_buffer=0.32,
        ndbi_granja=-0.22,
        ndbi_buffer=-0.18
    )
    mock_indices_ref = SpectralIndices(
        ndvi_granja=0.65,
        ndvi_buffer=0.64,
        ndmi_granja=0.30,
        ndmi_buffer=0.30,
        ndbi_granja=-0.18,
        ndbi_buffer=-0.16
    )
    mock_ee_analyze.return_value = (
        mock_indices_rec,
        mock_indices_ref,
        DateRange(inicio="2026-03-01", fin="2026-09-01"),
        DateRange(inicio="2024-03-01", fin="2024-09-01")
    )

    response = client.post("/farms/farm-123/analyze", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["farmId"] == "farm-123"
    assert "score" in data
    assert data["score"] >= 75.0
    assert data["nivelRiesgo"] == "Bajo"
    assert "desglose" in data
    assert len(data["desglose"]) == 3

    app.dependency_overrides.clear()


def test_get_certificate_mocked():
    mock_db = MagicMock()
    mock_farms_col = MagicMock()
    mock_analyses_col = MagicMock()
    mock_farm_doc = MagicMock()
    mock_farm_snapshot = MagicMock()

    mock_farm_snapshot.exists = True
    mock_farm_snapshot.to_dict.return_value = {
        "farmId": "farm-123",
        "nombre": "Hacienda El Roble",
        "geojson": {
            "type": "Polygon",
            "coordinates": [
                [[-73.50, 5.10], [-73.49, 5.10], [-73.49, 5.09], [-73.50, 5.09], [-73.50, 5.10]]
            ]
        },
        "fechaCreacion": "2026-09-01T00:00:00Z"
    }
    mock_farm_doc.get.return_value = mock_farm_snapshot

    def get_collection(name):
        if name == "farms":
            return mock_farms_col
        elif name == "analyses":
            return mock_analyses_col
        return MagicMock()

    mock_db.collection.side_effect = get_collection
    mock_farms_col.document.return_value = mock_farm_doc

    # Mock analysis query
    mock_query = MagicMock()
    mock_analyses_col.where.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query

    mock_analysis_snapshot = MagicMock()
    mock_analysis_snapshot.to_dict.return_value = {
        "analysisId": "analysis-456",
        "farmId": "farm-123",
        "periodoReferencia": {"inicio": "2024-03-01", "fin": "2024-09-01"},
        "periodoReciente": {"inicio": "2026-03-01", "fin": "2026-09-01"},
        "indices": {
            "reciente": {
                "ndvi_granja": 0.72,
                "ndvi_buffer": 0.68,
                "ndmi_granja": 0.38,
                "ndmi_buffer": 0.32,
                "ndbi_granja": -0.22,
                "ndbi_buffer": -0.18
            },
            "referencia": {
                "ndvi_granja": 0.65,
                "ndvi_buffer": 0.64,
                "ndmi_granja": 0.30,
                "ndmi_buffer": 0.30,
                "ndbi_granja": -0.18,
                "ndbi_buffer": -0.16
            }
        },
        "deltas": {
            "delta_ndvi_granja": 0.07,
            "delta_ndvi_buffer": 0.04,
            "delta_ndvi_relativo": 0.03,
            "delta_ndmi_granja": 0.08,
            "delta_ndmi_buffer": 0.02,
            "delta_ndmi_relativo": 0.06,
            "delta_ndbi_granja": -0.04,
            "delta_ndbi_buffer": -0.02,
            "delta_ndbi_relativo": -0.02
        },
        "score": 100.0,
        "nivelRiesgo": "Bajo",
        "desglose": [],
        "resumenEjecutivo": "Pre-evaluación favorable",
        "fechaCreacion": "2026-09-01T12:00:00Z"
    }
    mock_query.stream.return_value = [mock_analysis_snapshot]

    app.dependency_overrides[get_db] = lambda: mock_db

    response = client.get("/farms/farm-123/certificate")
    assert response.status_code == 200
    data = response.json()
    assert data["analysisId"] == "analysis-456"
    assert data["farmId"] == "farm-123"
    assert data["farmNombre"] == "Hacienda El Roble"
    assert data["score"] == 100.0
    assert "validez" in data

    app.dependency_overrides.clear()

