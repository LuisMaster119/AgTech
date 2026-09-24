from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.services.buffer_view import get_buffer_geometry


def test_geometry_matches_existing_operations():
    geometry = {'type': 'Polygon', 'coordinates': []}
    with patch('app.services.buffer_view.initialize_earth_engine') as initialize, patch('app.services.buffer_view.ee.Geometry') as constructor:
        farm = constructor.return_value
        farm.buffer.return_value.difference.return_value.getInfo.return_value = geometry
        assert get_buffer_geometry({'type': 'Feature', 'geometry': geometry}) == geometry
        initialize.assert_called_once()
        constructor.assert_called_once_with(geometry)
        farm.buffer.assert_called_once_with(500)
        farm.buffer.return_value.difference.assert_called_once_with(farm, maxError=1)


def test_buffer_read_only_and_errors():
    db = MagicMock()
    doc = db.collection.return_value.document.return_value.get.return_value
    doc.exists = True
    doc.to_dict.return_value = {'geojson': {'type': 'Polygon'}}
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as client, patch('app.routers.farms.get_buffer_geometry', return_value={'type': 'Polygon', 'coordinates': []}) as geometry:
            response = client.get('/farms/demo/buffer')
            assert response.status_code == 200
            assert response.json()['distanciaMetros'] == 500
            db.collection.assert_called_once_with('farms')
            db.collection.return_value.document.return_value.set.assert_not_called()
            geometry.side_effect = RuntimeError('private error')
            response = client.get('/farms/demo/buffer')
            assert response.status_code == 502
            assert 'private' not in response.text
            doc.exists = False
            assert client.get('/farms/demo/buffer').status_code == 404
            db.collection.side_effect = RuntimeError('database error')
            assert client.get('/farms/demo/buffer').status_code == 503
    finally:
        app.dependency_overrides.clear()
