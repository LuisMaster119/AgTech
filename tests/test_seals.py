from copy import deepcopy
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.services.seals import evaluate_profile, polygon_has_structure
from scripts.seed_demo import demo_records


def test_complete_demo_and_optional_city():
    farm = deepcopy(demo_records()[1][2])
    farm.pop('ciudad', None)
    original = deepcopy(farm)
    result = evaluate_profile('demo', farm)
    assert result.estado == 'cumple'
    assert result.esDemostracion is True
    assert len(result.criterios) == 8
    assert len(result.nivelesPendientes) == 2
    assert result.versionCriterios == 'perfil-base-1.0'
    assert farm == original


def test_missing_legacy_and_no_score_dependency():
    assert evaluate_profile('legacy', {'nombre': 'Antigua', 'score': 100}).estado == 'faltan_datos'
    farm = deepcopy(demo_records()[1][2])
    farm.update(score=0, esDemostracion=False)
    assert evaluate_profile('real', farm).estado == 'cumple'
    assert evaluate_profile('demo-prefix', farm).esDemostracion is False
    farm['historia'] = '  '
    result = evaluate_profile('id', farm)
    assert result.estado == 'faltan_datos'
    assert [c.campo for c in result.criterios if not c.cumple] == ['historia']


@pytest.mark.parametrize('ring', [
    [], [[0, 0], [1, 1], [2, 2], [0, 0]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [181, 0], [0, 1], [0, 0]],
    [[0, 0], [1, float('nan')], [0, 1], [0, 0]],
    [[0, 0], [True, 0], [0, 1], [0, 0]],
])
def test_invalid_ring(ring):
    assert not polygon_has_structure({'type': 'Polygon', 'coordinates': [ring]})


def test_endpoint_read_only_errors_and_privacy():
    db = MagicMock()
    doc = db.collection.return_value.document.return_value.get.return_value
    doc.exists = True
    doc.to_dict.return_value = {**demo_records()[1][2], 'email': 'private'}
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as client:
            response = client.get('/farms/demo/seal')
            assert response.status_code == 200
            assert response.json()['estado'] == 'cumple'
            assert 'private' not in response.text
            db.collection.assert_called_once_with('farms')
            db.collection.return_value.document.return_value.set.assert_not_called()
            doc.exists = False
            assert client.get('/farms/missing/seal').status_code == 404
            db.collection.side_effect = RuntimeError('private database error')
            response = client.get('/farms/demo/seal')
            assert response.status_code == 503
            assert 'private' not in response.text
    finally:
        app.dependency_overrides.clear()
