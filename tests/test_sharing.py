from unittest.mock import MagicMock, patch
import xml.etree.ElementTree as ET

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings, settings
from app.database import get_db
from app.main import app
from app.services.sharing import profile_share


def test_qr_encodes_exact_public_link():
    import qrcode
    with patch('app.services.sharing.qrcode.make', wraps=qrcode.make) as make:
        data = profile_share('https://example.test/', 'á & x')
    assert data['publicUrl'] == 'https://example.test/parcela.html?id=%C3%A1+%26+x'
    assert make.call_args.args[0] == data['publicUrl']
    root = ET.fromstring(data['qrSvg'])
    assert root.tag.endswith('svg')
    assert root.find('{http://www.w3.org/2000/svg}path') is not None


@pytest.mark.parametrize('url', ['javascript:alert(1)', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?token=x'])
def test_invalid_public_origin(url):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, PUBLIC_BASE_URL=url)


def test_share_endpoint_read_only(monkeypatch):
    db = MagicMock()
    doc = db.collection.return_value.document.return_value.get.return_value
    doc.exists = True
    app.dependency_overrides[get_db] = lambda: db
    monkeypatch.setattr(settings, 'PUBLIC_BASE_URL', None)
    try:
        with TestClient(app) as client:
            response = client.get('/farms/demo/share')
            assert response.status_code == 200
            assert response.json()['publicUrl'] == 'http://testserver/parcela.html?id=demo'
            monkeypatch.setattr(settings, 'PUBLIC_BASE_URL', 'https://public.example/')
            assert client.get('/farms/demo/share').json()['publicUrl'].startswith('https://public.example/')
            doc.exists = False
            assert client.get('/farms/missing/share').status_code == 404
            db.collection.side_effect = RuntimeError('private credentials')
            response = client.get('/farms/demo/share')
            assert response.status_code == 503
            assert 'credentials' not in response.text
            doc.to_dict.assert_not_called()
            db.collection.return_value.document.return_value.set.assert_not_called()
    finally:
        app.dependency_overrides.clear()
