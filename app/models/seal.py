from typing import Literal

from pydantic import BaseModel


class ProfileCriterion(BaseModel):
    campo: str
    descripcion: str
    cumple: bool


class SealEvaluation(BaseModel):
    farmId: str
    versionCriterios: str
    fechaEvaluacion: str
    esDemostracion: bool
    titulo: str = "Evaluación preliminar AgTech"
    nivel: str = "Nivel I Base · Perfil documentado"
    estado: Literal["cumple", "faltan_datos"]
    criterios: list[ProfileCriterion]
    alcance: str = (
        "Comprueba presencia de información y estructura del polígono; no verifica "
        "su veracidad, titularidad, validez catastral ni desempeño ambiental. "
        "No constituye una certificación oficial."
    )
    nivelesPendientes: list[str] = [
        "Nivel II Export · Pendiente de criterios, evidencia y revisión",
        "Élite Regenerativo · Pendiente de criterios, evidencia y revisión",
    ]
