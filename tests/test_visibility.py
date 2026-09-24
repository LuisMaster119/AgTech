from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from app.routers.auth import require_provider, optional_provider, DEMO_PROVIDER
from scripts.seed_demo import demo_records

@pytest.fixture
def api():
    db = MagicMock()
    data = {**demo_records()[1][2], 'visible': False}
    doc = MagicMock(exists=True)
    doc.to_dict.side_effect = lambda: dict(data)
    doc.update_time = datetime.now(timezone.utc)
    ref = db.collection.return_value.document.return_value
    ref.get.return_value = doc
    ref.update.side_effect = lambda values, **kwargs: data.update(values)
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_provider] = lambda: DEMO_PROVIDER
    app.dependency_overrides[optional_provider] = lambda: None
    with TestClient(app) as client:
        yield client, db, data, doc
    app.dependency_overrides.clear()

@pytest.mark.parametrize('suffix', ['', '/certificate', '/seal', '/share', '/buffer', '/analyze'])
def test_hidden_is_not_public_even_with_view_parameter(api, suffix):
    client, db, data, doc = api
    with patch('app.routers.farms.analyze_farm_satellite_data') as analyze, patch('app.routers.farms.get_buffer_geometry') as buffer:
        response = client.request('POST' if suffix == '/analyze' else 'GET', '/farms/hidden'+suffix+'?vista=proveedor')
    assert response.status_code == 404
    assert response.headers['cache-control'] == 'no-store'
    analyze.assert_not_called()
    buffer.assert_not_called()
    db.collection.return_value.document.return_value.update.assert_not_called()


def test_only_owner_can_read_hidden(api):
    client, db, data, doc = api
    app.dependency_overrides[optional_provider] = lambda: DEMO_PROVIDER
    assert client.get('/farms/hidden').status_code == 200
    data['providerId'] = 'someone-else'
    assert client.get('/farms/hidden').status_code == 404


def test_catalog_filters_hidden_and_preserves_legacy(api):
    client, db, data, doc = api
    legacy = MagicMock(exists=True)
    legacy.to_dict.return_value = {k:v for k,v in data.items() if k != 'visible'}
    db.collection.return_value.order_by.return_value.stream.return_value = [doc, legacy]
    result = client.get('/farms')
    assert len(result.json()) == 1
    assert result.json()[0]['visible'] is True
    assert result.headers['cache-control'] == 'no-store'
    db.collection.return_value.order_by.return_value.stream.side_effect = RuntimeError('index')
    db.collection.return_value.stream.return_value = [doc, legacy]
    assert len(client.get('/farms').json()) == 1


def test_visibility_persists_and_is_idempotent(api):
    client, db, data, doc = api
    original = dict(data)
    for visible in [True, False, False]:
        response = client.patch('/providers/me/farms/hidden/visibility', json={'visible': visible})
        assert response.status_code == 200
        assert response.json()['visible'] is visible
        assert data['visible'] is visible
        assert client.get('/farms/hidden').status_code == (200 if visible else 404)
    assert {k:v for k,v in data.items() if k!='visible'} == {k:v for k,v in original.items() if k!='visible'}
    db.collection.return_value.where.return_value.stream.return_value = [doc]
    assert client.get('/providers/me/farms').json()[0]['visible'] is False

@pytest.mark.parametrize('payload', [{}, {'visible': 'false'}, {'visible': 0}, {'visible': None}])
def test_visibility_requires_boolean(api, payload):
    client, db, data, doc = api
    assert client.patch('/providers/me/farms/hidden/visibility', json=payload).status_code == 422
    db.collection.return_value.document.return_value.update.assert_not_called()


def test_missing_and_other_owner_cannot_modify(api):
    client, db, data, doc = api
    for provider_id in [None, 'other']:
        data['providerId'] = provider_id
        assert client.patch('/providers/me/farms/hidden/visibility', json={'visible': True}).status_code == 404
    doc.exists = False
    assert client.patch('/providers/me/farms/hidden/visibility', json={'visible': True}).status_code == 404
    db.collection.return_value.document.return_value.update.assert_not_called()


def test_session_required_and_storage_failure(api, monkeypatch):
    client, db, data, doc = api
    db.collection.return_value.document.return_value.update.side_effect = RuntimeError('private storage failure')
    response = client.patch('/providers/me/farms/hidden/visibility', json={'visible': True})
    assert response.status_code == 503 and 'private storage' not in response.text
    from app.config import settings
    monkeypatch.setattr(settings, 'DEMO_AUTH_ENABLED', True)
    del app.dependency_overrides[require_provider]
    db.reset_mock()
    assert client.patch('/providers/me/farms/hidden/visibility', json={'visible': True}).status_code == 401
    db.collection.assert_not_called()

def test_hidden_owner_access_uses_valid_session_not_url(api, monkeypatch):
    client, db, data, doc = api
    from app.config import settings
    monkeypatch.setattr(settings, 'DEMO_AUTH_ENABLED', True)
    del app.dependency_overrides[optional_provider]
    assert client.get('/farms/hidden', headers={'Authorization': 'Bearer invalid'}).status_code == 404
    session = client.post('/auth/demo/session', json={'email':'proveedor@demo.test', 'password':'demo123'}).json()
    headers = {'Authorization': 'Bearer '+session['accessToken']}
    assert client.get('/farms/hidden', headers=headers).status_code == 200
    assert client.get('/farms/hidden/share', headers=headers).status_code == 200
    client.delete('/auth/demo/session', headers=headers)
    assert client.get('/farms/hidden', headers=headers).status_code == 404
