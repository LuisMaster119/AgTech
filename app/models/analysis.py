from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator


class RiskLevel(str, Enum):
    BAJO = "Bajo"
    MEDIO = "Medio"
    ALTO = "Alto"


class DateRange(BaseModel):
    inicio: str = Field(..., description="Fecha de inicio (YYYY-MM-DD)")
    fin: str = Field(..., description="Fecha de fin (YYYY-MM-DD)")

    @field_validator("inicio", "fin")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
            return v
        except ValueError:
            raise ValueError(f"Formato de fecha inválido: {v}. Debe ser YYYY-MM-DD.")

    @field_validator("fin")
    @classmethod
    def validate_range(cls, v: str, info) -> str:
        if "inicio" in info.data:
            start_date = date.fromisoformat(info.data["inicio"])
            end_date = date.fromisoformat(v)
            if end_date <= start_date:
                raise ValueError(f"La fecha de fin ({v}) debe ser posterior a la fecha de inicio ({info.data['inicio']}).")
        return v


class AnalyzeRequest(BaseModel):
    periodoReciente: Optional[DateRange] = Field(
        None,
        description="Rango de fechas para el periodo reciente. Si no se especifica, toma los últimos 6 meses."
    )
    periodoReferencia: Optional[DateRange] = Field(
        None,
        description="Rango de fechas para el periodo de referencia histórico (~2 años atrás). Si no se especifica, toma la misma ventana estacional de hace 2 años."
    )


class SpectralIndices(BaseModel):
    ndvi_granja: float = Field(..., description="Índice NDVI promedio en la granja")
    ndvi_buffer: float = Field(..., description="Índice NDVI promedio en el buffer circundante (500m)")
    ndmi_granja: float = Field(..., description="Índice NDMI promedio en la granja")
    ndmi_buffer: float = Field(..., description="Índice NDMI promedio en el buffer circundante (500m)")
    ndbi_granja: float = Field(..., description="Índice NDBI promedio en la granja")
    ndbi_buffer: float = Field(..., description="Índice NDBI promedio en el buffer circundante (500m)")


class DeltaIndices(BaseModel):
    delta_ndvi_granja: float = Field(..., description="Cambio absoluto de NDVI en la granja (Reciente - Referencia)")
    delta_ndvi_buffer: float = Field(..., description="Cambio absoluto de NDVI en el buffer (Reciente - Referencia)")
    delta_ndvi_relativo: float = Field(..., description="Diferencia de cambio NDVI (Granja - Buffer)")

    delta_ndmi_granja: float = Field(..., description="Cambio absoluto de NDMI en la granja (Reciente - Referencia)")
    delta_ndmi_buffer: float = Field(..., description="Cambio absoluto de NDMI en el buffer (Reciente - Referencia)")
    delta_ndmi_relativo: float = Field(..., description="Diferencia de cambio NDMI (Granja - Buffer)")

    delta_ndbi_granja: float = Field(..., description="Cambio absoluto de NDBI en la granja (Reciente - Referencia)")
    delta_ndbi_buffer: float = Field(..., description="Cambio absoluto de NDBI en el buffer (Reciente - Referencia)")
    delta_ndbi_relativo: float = Field(..., description="Diferencia de cambio NDBI (Granja - Buffer)")


class MetricEvaluation(BaseModel):
    indice: str
    nombre: str
    descripcion: str
    valor_referencia_granja: float
    valor_reciente_granja: float
    delta_granja: float
    delta_buffer: float
    delta_relativo: float
    impacto: str
    penalizacion: float
    interpretacion: str


class AnalysisResponse(BaseModel):
    analysisId: str = Field(..., description="Identificador único del análisis")
    farmId: str = Field(..., description="ID de la granja analizada")
    periodoReferencia: DateRange
    periodoReciente: DateRange
    indices: Dict[str, SpectralIndices] = Field(
        ...,
        description="Valores de índices espectrales calculados para el periodo reciente y de referencia"
    )
    deltas: DeltaIndices = Field(..., description="Deltas temporales y relativos calculados")
    score: float = Field(..., ge=0, le=100, description="Score de salud e impacto ecológico (0 a 100)")
    nivelRiesgo: RiskLevel = Field(..., description="Nivel de riesgo ecológico: Bajo, Medio o Alto")
    desglose: List[MetricEvaluation] = Field(..., description="Desglose explicable de cada índice analizado")
    resumenEjecutivo: str = Field(..., description="Diagnóstico sintético del análisis satelital")
    fechaCreacion: str = Field(..., description="Fecha y hora de generación del análisis en ISO 8601")


class CertificateResponse(AnalysisResponse):
    tipoDocumento: str = Field(
        default="Pre-Evaluación de Impacto Ecológico Satelital para Certificación de Exportación",
        description="Título oficial del documento emitido"
    )
    validez: str = Field(
        default="Pre-evaluación técnica no vinculante, generada a partir de imágenes Sentinel-2",
        description="Aviso legal sobre el alcance del reporte"
    )
    farmNombre: Optional[str] = Field(None, description="Nombre de la granja")
