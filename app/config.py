import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, AnyHttpUrl, field_validator


class Settings(BaseSettings):
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    FIRESTORE_DATABASE_ID: str = "ag-tech"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DEMO_AUTH_ENABLED: bool = False
    PUBLIC_BASE_URL: Optional[AnyHttpUrl] = None

    @field_validator('PUBLIC_BASE_URL')
    @classmethod
    def public_origin(cls, value):
        if value and (value.username or value.password or value.query or value.fragment
                      or value.path not in (None, '', '/')):
            raise ValueError('PUBLIC_BASE_URL debe ser un origen HTTP(S), sin ruta ni credenciales.')
        return value
    # Activación explícita para evitar enviar coordenadas sin configurar el servicio.
    GEOCODING_ENABLED: bool = False
    GEOCODING_URL: str = "https://nominatim.openstreetmap.org/reverse"
    GEOCODING_USER_AGENT: str = "AgTech/1.0"
    GEOCODING_TIMEOUT_SECONDS: float = Field(default=5.0, gt=0, le=30)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Asegurar que GOOGLE_APPLICATION_CREDENTIALS esté expuesto en el entorno para ADC si viene de .env
if settings.GOOGLE_APPLICATION_CREDENTIALS and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.GOOGLE_APPLICATION_CREDENTIALS
