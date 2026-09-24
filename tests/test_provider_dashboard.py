from unittest.mock import MagicMock, AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.routers.auth import require_provider, DEMO_PROVIDER
from scripts.seed_demo import demo_records


@pytest.fixture
def dashboard():
    db = MagicMock()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_provider] = lambda: DEMO_PROVIDER
    with TestClient(app) as client:
        yield client, db
    app.dependency_overrides.clear()


def test_list_only_session_provider(dashboard):
    client, db = dashboard
    farm = demo_records()[1][2]
    other = {**farm, 'farmId': 'other', 'providerId': 'another-provider'}
    legacy = {**farm, 'farmId': 'legacy', 'providerId': None}
    newer = {**farm, 'farmId': 'newer', 'fechaCreacion': '2026-09-23', 'email': 'private'}
    docs = []
    for data in [farm, other, legacy, newer]:
        doc = MagicMock(exists=True)
        doc.to_dict.return_value = data
        docs.append(doc)
    query = db.collection.return_value.where
    query.return_value.stream.return_value = docs
    response = client.get('/providers/me/farms?providerId=another-provider')
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    assert [f['farmId'] for f in response.json()] == ['newer', farm['farmId']]
    assert 'email' not in response.json()[0]
    assert 'providerId' not in response.json()[0]
    field_filter = query.call_args.kwargs['filter']
    assert field_filter.field_path == 'providerId'
    assert field_filter.value == DEMO_PROVIDER.providerId
    db.collection.return_value.document.assert_not_called()


def test_empty_and_failure(dashboard):
    client, db = dashboard
    query = db.collection.return_value.where.return_value
    query.stream.return_value = []
    assert client.get('/providers/me/farms').json() == []
    query.stream.side_effect = RuntimeError('private failure details')
    response = client.get('/providers/me/farms')
    assert response.status_code == 503
    assert 'private failure' not in response.text


def test_no_session_cannot_read(dashboard, monkeypatch):
    client, db = dashboard
    from app.config import settings
    monkeypatch.setattr(settings, 'DEMO_AUTH_ENABLED', True)
    del app.dependency_overrides[require_provider]
    assert client.get('/providers/me/farms').status_code == 401
    db.collection.assert_not_called()


def test_create_uses_session_and_preserves_geometry(dashboard):
    client, db = dashboard
    payload = {**demo_records()[1][2], 'providerId': 'spoofed-provider'}
    with patch('app.routers.providers.enrich_location', new_callable=AsyncMock) as enrich:
        response = client.post('/providers/me/farms', json=payload)
    assert response.status_code == 201
    data = db.collection.return_value.document.return_value.set.call_args.args[0]
    assert data['providerId'] == DEMO_PROVIDER.providerId
    assert data['geojson'] == payload['geojson']
    assert data['esDemostracion'] is True
    assert response.json()['farmId'] == data['farmId']
    assert data['farmId'] != payload['farmId']
    enrich.assert_awaited_once()
    db.collection.assert_called_once_with('farms')


def test_create_invalid_and_failed_write(dashboard):
    client, db = dashboard
    assert client.post('/providers/me/farms', json={'nombre': 'x', 'geojson': {}}).status_code == 422
    db.collection.assert_not_called()
    db.collection.return_value.document.return_value.set.side_effect = RuntimeError('failure')
    with patch('app.routers.providers.enrich_location', new_callable=AsyncMock):
        assert client.post('/providers/me/farms', json=demo_records()[1][2]).status_code == 503


def test_create_requires_session(dashboard, monkeypatch):
    client, db = dashboard
    from app.config import settings
    monkeypatch.setattr(settings, 'DEMO_AUTH_ENABLED', True)
    del app.dependency_overrides[require_provider]
    assert client.post('/providers/me/farms', json=demo_records()[1][2]).status_code == 401
    db.collection.assert_not_called()
