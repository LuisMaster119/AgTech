"""Identidad de datos del proveedor; no representa una sesión ni autorización."""
from pydantic import BaseModel, Field


class Provider(BaseModel):
    providerId: str = Field(min_length=1, max_length=150, pattern=r"^[^/]+$")
    nombrePublico: str = Field(min_length=2, max_length=150)
    fechaCreacion: str
    esDemostracion: bool = False
