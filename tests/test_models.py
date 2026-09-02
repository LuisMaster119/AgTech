import pytest
from pydantic import ValidationError
from app.models.farm import FarmCreate, GeoJSONPolygon
from app.models.analysis import DateRange, AnalyzeRequest


def test_valid_geojson_polygon():
    coords = [
        [
            [-74.0060, 4.7110],
            [-74.0050, 4.7110],
            [-74.0050, 4.7100],
            [-74.0060, 4.7100],
            [-74.0060, 4.7110]
        ]
    ]
    polygon = GeoJSONPolygon(coordinates=coords)
    assert polygon.type == "Polygon"
    assert len(polygon.coordinates[0]) == 5


def test_geojson_auto_close():
    coords = [
        [
            [-74.0060, 4.7110],
            [-74.0050, 4.7110],
            [-74.0050, 4.7100],
            [-74.0060, 4.7100]
        ]
    ]
    polygon = GeoJSONPolygon(coordinates=coords)
    assert polygon.coordinates[0][0] == polygon.coordinates[0][-1]
    assert len(polygon.coordinates[0]) == 5


def test_invalid_geojson_coordinates_range():
    coords = [
        [
            [-200.0, 4.7110],
            [-74.0050, 4.7110],
            [-74.0050, 4.7100],
            [-200.0, 4.7110]
        ]
    ]
    with pytest.raises(ValidationError):
        GeoJSONPolygon(coordinates=coords)


def test_farm_create_with_dict():
    payload = {
        "nombre": "Finca San Jerónimo",
        "geojson": {
            "type": "Polygon",
            "coordinates": [
                [
                    [-75.60, 6.20],
                    [-75.59, 6.20],
                    [-75.59, 6.19],
                    [-75.60, 6.19],
                    [-75.60, 6.20]
                ]
            ]
        }
    }
    farm = FarmCreate(**payload)
    assert farm.nombre == "Finca San Jerónimo"
    assert farm.geojson["type"] == "Polygon"


def test_date_range_validation():
    valid = DateRange(inicio="2023-01-01", fin="2023-06-30")
    assert valid.inicio == "2023-01-01"

    with pytest.raises(ValidationError):
        DateRange(inicio="2023-06-30", fin="2023-01-01")

    with pytest.raises(ValidationError):
        DateRange(inicio="fecha-invalida", fin="2023-06-30")
