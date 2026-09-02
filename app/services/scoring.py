"""Servicio de cálculo de score de impacto ecológico y análisis explicativo de deltas espectrales.

METODOLOGÍA Y FÓRMULA DE SCORING (0 a 100):
--------------------------------------------------------------------------------
El objetivo de este sistema es pre-evaluar si una granja está degradando el ecosistema
a su alrededor, utilizando imágenes satelitales multiespectrales (Sentinel-2).

Para evitar sesgos por estacionalidad climática o sequías regionales que afecten a toda
la zona por igual, el análisis utiliza un enfoque de control ecológico diferencial:
compara la tasa de cambio dentro de la granja con la tasa de cambio en un buffer anular
de 500 metros alrededor de la misma (excluyendo el área de la granja).

1. ÍNDICES EVALUADOS:
   - NDVI (Vegetación): (B8 - B4) / (B8 + B4) -> Salud y densidad de la cubierta vegetal.
   - NDMI (Humedad):    (B8 - B11) / (B8 + B11) -> Contenido de agua en el dosel y suelo.
   - NDBI (Suelo/Degr): (B11 - B8) / (B11 + B8) -> Suelo desnudo, erosión o impermeabilización.

2. DELTAS TEMPORALES:
   Para cada índice X y cada zona (granja, buffer):
   Delta_X = X_Reciente - X_Referencia

3. DELTA RELATIVO (Impacto Diferencial):
   RelDelta_X = Delta_X_Granja - Delta_X_Buffer

   - Para NDVI y NDMI: Un valor RelDelta negativo indica que la granja perdió vegetación o
     humedad más rápido que su entorno circundante (señal de alerta).
   - Para NDBI: Un valor RelDelta positivo indica que la granja expuso más suelo desnudo o
     se degradó a un ritmo superior al de su entorno (señal de alerta).

4. PONDERACIÓN DEL SCORE (Base 100 puntos):
   - Componente NDVI (Peso: 45%):
     Penalización_NDVI = min(45.0, abs(RelDelta_NDVI) * 150.0) si RelDelta_NDVI < 0 sino 0.0
   - Componente NDMI (Peso: 30%):
     Penalización_NDMI = min(30.0, abs(RelDelta_NDMI) * 120.0) si RelDelta_NDMI < 0 sino 0.0
   - Componente NDBI (Peso: 25%):
     Penalización_NDBI = min(25.0, RelDelta_NDBI * 100.0) si RelDelta_NDBI > 0 sino 0.0

   Score = round(max(0.0, min(100.0, 100.0 - (Penalización_NDVI + Penalización_NDMI + Penalización_NDBI))), 2)

5. UMBRALES DE RIESGO:
   - Score >= 75.0 -> Riesgo 'Bajo' (Sin evidencia de degradación acelerada respecto al entorno).
   - 50.0 <= Score < 75.0 -> Riesgo 'Medio' (Señales de alerta moderadas, requiere inspección).
   - Score < 50.0 -> Riesgo 'Alto' (Degradación significativa en comparación con el entorno).
"""

from typing import Tuple, List, Dict
from app.models.analysis import (
    SpectralIndices,
    DeltaIndices,
    MetricEvaluation,
    RiskLevel,
)


def calculate_ecological_score(
    reciente: SpectralIndices,
    referencia: SpectralIndices
) -> Tuple[DeltaIndices, float, RiskLevel, List[MetricEvaluation], str]:
    """Calcula los deltas temporales y relativos, el score de impacto ecológico (0-100),

    el nivel de riesgo y el desglose explicable por índice.
    """
    # 1. Deltas de NDVI
    d_ndvi_farm = reciente.ndvi_granja - referencia.ndvi_granja
    d_ndvi_buff = reciente.ndvi_buffer - referencia.ndvi_buffer
    rel_d_ndvi = d_ndvi_farm - d_ndvi_buff

    # 2. Deltas de NDMI
    d_ndmi_farm = reciente.ndmi_granja - referencia.ndmi_granja
    d_ndmi_buff = reciente.ndmi_buffer - referencia.ndmi_buffer
    rel_d_ndmi = d_ndmi_farm - d_ndmi_buff

    # 3. Deltas de NDBI
    d_ndbi_farm = reciente.ndbi_granja - referencia.ndbi_granja
    d_ndbi_buff = reciente.ndbi_buffer - referencia.ndbi_buffer
    rel_d_ndbi = d_ndbi_farm - d_ndbi_buff

    deltas = DeltaIndices(
        delta_ndvi_granja=round(d_ndvi_farm, 4),
        delta_ndvi_buffer=round(d_ndvi_buff, 4),
        delta_ndvi_relativo=round(rel_d_ndvi, 4),
        delta_ndmi_granja=round(d_ndmi_farm, 4),
        delta_ndmi_buffer=round(d_ndmi_buff, 4),
        delta_ndmi_relativo=round(rel_d_ndmi, 4),
        delta_ndbi_granja=round(d_ndbi_farm, 4),
        delta_ndbi_buffer=round(d_ndbi_buff, 4),
        delta_ndbi_relativo=round(rel_d_ndbi, 4),
    )

    # 4. Cálculo de penalizaciones por índice
    # NDVI: penaliza si la granja pierde vegetación a mayor tasa que el buffer (peso máx: 45)
    if rel_d_ndvi < 0:
        penalizacion_ndvi = min(45.0, abs(rel_d_ndvi) * 150.0)
    else:
        penalizacion_ndvi = 0.0

    # NDMI: penaliza si la granja pierde humedad a mayor tasa que el buffer (peso máx: 30)
    if rel_d_ndmi < 0:
        penalizacion_ndmi = min(30.0, abs(rel_d_ndmi) * 120.0)
    else:
        penalizacion_ndmi = 0.0

    # NDBI: penaliza si la granja aumenta suelo desnudo/degradación más que el buffer (peso máx: 25)
    if rel_d_ndbi > 0:
        penalizacion_ndbi = min(25.0, rel_d_ndbi * 100.0)
    else:
        penalizacion_ndbi = 0.0

    total_penalizaciones = penalizacion_ndvi + penalizacion_ndmi + penalizacion_ndbi
    score = round(max(0.0, min(100.0, 100.0 - total_penalizaciones)), 2)

    # 5. Determinación del nivel de riesgo
    if score >= 75.0:
        nivel_riesgo = RiskLevel.BAJO
    elif score >= 50.0:
        nivel_riesgo = RiskLevel.MEDIO
    else:
        nivel_riesgo = RiskLevel.ALTO

    # 6. Desglose detallado y explicable para auditoría
    desglose = [
        MetricEvaluation(
            indice="NDVI",
            nombre="Índice de Vegetación de Diferencia Normalizada",
            descripcion="Mide la densidad, vigor y biomasa vegetal activa (Rango: -1 a 1).",
            valor_referencia_granja=round(referencia.ndvi_granja, 4),
            valor_reciente_granja=round(reciente.ndvi_granja, 4),
            delta_granja=round(d_ndvi_farm, 4),
            delta_buffer=round(d_ndvi_buff, 4),
            delta_relativo=round(rel_d_ndvi, 4),
            impacto="Positivo / Estable" if rel_d_ndvi >= 0 else "Degradación Relativa",
            penalizacion=round(penalizacion_ndvi, 2),
            interpretacion=(
                f"La vegetación de la granja evolucionó favorablemente o al ritmo de su entorno ({rel_d_ndvi:+.4f})."
                if rel_d_ndvi >= 0 else
                f"La granja perdió cobertura vegetal a un ritmo superior al de su entorno circundante ({rel_d_ndvi:+.4f})."
            )
        ),
        MetricEvaluation(
            indice="NDMI",
            nombre="Índice de Humedad de Diferencia Normalizada",
            descripcion="Mide el contenido de agua en la cubierta vegetal y estrés hídrico (Rango: -1 a 1).",
            valor_referencia_granja=round(referencia.ndmi_granja, 4),
            valor_reciente_granja=round(reciente.ndmi_granja, 4),
            delta_granja=round(d_ndmi_farm, 4),
            delta_buffer=round(d_ndmi_buff, 4),
            delta_relativo=round(rel_d_ndmi, 4),
            impacto="Positivo / Estable" if rel_d_ndmi >= 0 else "Estrés Hídrico Relativo",
            penalizacion=round(penalizacion_ndmi, 2),
            interpretacion=(
                f"Los niveles de humedad en la granja se mantuvieron estables o superiores al entorno ({rel_d_ndmi:+.4f})."
                if rel_d_ndmi >= 0 else
                f"La granja presenta una reducción relativa en su contenido de humedad comparada con el buffer ({rel_d_ndmi:+.4f})."
            )
        ),
        MetricEvaluation(
            indice="NDBI",
            nombre="Índice de Suelo Desnudo y Degradación",
            descripcion="Mide la exposición de suelo descubierto o infraestructura construida (Rango: -1 a 1).",
            valor_referencia_granja=round(referencia.ndbi_granja, 4),
            valor_reciente_granja=round(reciente.ndbi_granja, 4),
            delta_granja=round(d_ndbi_farm, 4),
            delta_buffer=round(d_ndbi_buff, 4),
            delta_relativo=round(rel_d_ndbi, 4),
            impacto="Favorable (Menor Suelo Expuesto)" if rel_d_ndbi <= 0 else "Incremento de Suelo Desnudo",
            penalizacion=round(penalizacion_ndbi, 2),
            interpretacion=(
                f"No se detectó un incremento anómalo de suelo expuesto frente al entorno ({rel_d_ndbi:+.4f})."
                if rel_d_ndbi <= 0 else
                f"Se detectó un incremento de suelo desnudo o degradado mayor al del entorno ({rel_d_ndbi:+.4f})."
            )
        )
    ]

    # 7. Resumen Ejecutivo
    if nivel_riesgo == RiskLevel.BAJO:
        resumen = (
            f"Pre-evaluación FAVORABLE (Score: {score}/100 - Riesgo BAJO). La granja mantiene una dinámica ecológica "
            f"consistente con su entorno circundante, sin evidencia de degradación acelerada de biomasa ni estrés hídrico desproporcionado."
        )
    elif nivel_riesgo == RiskLevel.MEDIO:
        resumen = (
            f"Pre-evaluación con OBSERVACIONES (Score: {score}/100 - Riesgo MEDIO). Se detectaron variaciones moderadas "
            f"en los indicadores espectrales de la granja en relación con su amortiguamiento de 500m. Se recomienda revisión de prácticas de manejo de suelo."
        )
    else:
        resumen = (
            f"Pre-evaluación DESFAVORABLE (Score: {score}/100 - Riesgo ALTO). Se identificó una degradación significativa "
            f"en la granja en comparación con su ecosistema circundante (pérdida acelerada de vegetación, aumento de suelo expuesto o caída de humedad)."
        )

    return deltas, score, nivel_riesgo, desglose, resumen
