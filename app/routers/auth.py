"""Acceso simulado del MVP. Cualquier visitante puede obtener una sesión demo."""
import secrets
import time
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.config import settings
from app.models.provider import Provider

router = APIRouter(tags=["Acceso de demostración"])
bearer = HTTPBearer(auto_error=False)
_sessions: dict[str, float] = {}
_lock = Lock()
SESSION_SECONDS = 3600
DEMO_EMAIL = "proveedor@demo.test"
DEMO_PASSWORD = "demo123"


class DemoLogin(BaseModel):
    email: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


DEMO_PROVIDER = Provider(providerId="demo-provider-001", nombrePublico="Cooperativa Demo TerraSync",
                         fechaCreacion="2026-09-01T00:00:00+00:00", esDemostracion=True)


def require_demo_enabled():
    if not settings.DEMO_AUTH_ENABLED:
        raise HTTPException(503, "El acceso de demostración está desactivado.")


def require_provider(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> Provider:
    require_demo_enabled()
    with _lock:
        expiry = _sessions.get(credentials.credentials, 0) if credentials else 0
        if expiry <= time.time():
            if credentials:
                _sessions.pop(credentials.credentials, None)
            raise HTTPException(401, "Sesión ausente o vencida.", headers={"WWW-Authenticate": "Bearer"})
    return DEMO_PROVIDER


@router.post("/auth/demo/session", dependencies=[Depends(require_demo_enabled)])
def create_demo_session(response: Response, credentials: DemoLogin):
    if credentials.email.strip().lower() != DEMO_EMAIL or credentials.password != DEMO_PASSWORD:
        raise HTTPException(401, "Correo o contraseña de demostración incorrectos.")
    now = time.time()
    with _lock:
        for token, expiry in list(_sessions.items()):
            if expiry <= now:
                del _sessions[token]
        if len(_sessions) >= 1000:
            raise HTTPException(429, "Demasiadas sesiones demo. Inténtalo más tarde.")
        token = secrets.token_urlsafe(32)
        _sessions[token] = now + SESSION_SECONDS
    response.headers["Cache-Control"] = "no-store"
    return {"accessToken": token, "expiresIn": SESSION_SECONDS, "mode": "demo"}


@router.get("/providers/me", response_model=Provider)
def current_provider(response: Response, provider: Provider = Depends(require_provider)):
    response.headers["Cache-Control"] = "no-store"
    return provider


@router.delete("/auth/demo/session", status_code=204)
def close_demo_session(response: Response, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
    if credentials:
        with _lock:
            _sessions.pop(credentials.credentials, None)
    response.headers["Cache-Control"] = "no-store"
