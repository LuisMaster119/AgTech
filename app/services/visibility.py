"""Control de publicación, independiente de los cálculos ambientales."""
from fastapi import HTTPException, Response
from app.models.provider import Provider


def no_store(response: Response):
    response.headers['Cache-Control'] = 'no-store'


def require_visible_or_owner(data: dict, provider: Provider | None):
    if data.get('visible', True) is False and (
        provider is None or data.get('providerId') != provider.providerId
    ):
        raise HTTPException(404, 'Parcela no encontrada.', headers={'Cache-Control': 'no-store'})
