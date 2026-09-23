from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import auth


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(auth.settings, "DEMO_AUTH_ENABLED", True)
    auth._sessions.clear()
    with TestClient(app) as client:
        yield client
    auth._sessions.clear()


def test_demo_session_lifecycle(client):
    assert client.get('/providers/me').status_code == 401
    result = client.post('/auth/demo/session')
    assert result.status_code == 200
    assert result.headers['cache-control'] == 'no-store'
    token = result.json()['accessToken']
    headers = {'Authorization': f'Bearer {token}'}
    profile = client.get('/providers/me', headers=headers)
    assert profile.json()['providerId'] == 'demo-provider-001'
    assert profile.json()['esDemostracion'] is True
    assert profile.headers['cache-control'] == 'no-store'
    assert client.delete('/auth/demo/session', headers=headers).status_code == 204
    assert client.get('/providers/me', headers=headers).status_code == 401
    assert client.delete('/auth/demo/session', headers=headers).status_code == 204


def test_expired_and_forged_sessions(client):
    token = client.post('/auth/demo/session').json()['accessToken']
    with patch.object(auth.time, 'time', return_value=auth._sessions[token] + 1):
        assert client.get('/providers/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401
    assert client.get('/providers/me', headers={'Authorization': 'Bearer demo-provider-001'}).status_code == 401


def test_disabled_mode(client, monkeypatch):
    token = client.post('/auth/demo/session').json()['accessToken']
    monkeypatch.setattr(auth.settings, 'DEMO_AUTH_ENABLED', False)
    assert client.post('/auth/demo/session').status_code == 503
    assert client.get('/providers/me', headers={'Authorization': f'Bearer {token}'}).status_code == 503
    assert client.get('/').status_code == 200


def test_session_cleanup_and_limit(client):
    auth._sessions['expired'] = 0
    client.post('/auth/demo/session')
    assert 'expired' not in auth._sessions
    auth._sessions.update({str(i): auth.time.time() + 100 for i in range(1000)})
    assert client.post('/auth/demo/session').status_code == 429
