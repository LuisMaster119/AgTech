from app.models.analysis import SpectralIndices, RiskLevel
from app.services.scoring import calculate_ecological_score


def test_scoring_healthy_farm_low_risk():
    """Escenario: Granja con vegetación y humedad en aumento más rápido que su entorno."""
    referencia = SpectralIndices(
        ndvi_granja=0.60,
        ndvi_buffer=0.55,
        ndmi_granja=0.30,
        ndmi_buffer=0.25,
        ndbi_granja=-0.20,
        ndbi_buffer=-0.15,
    )
    reciente = SpectralIndices(
        ndvi_granja=0.75,  # +0.15
        ndvi_buffer=0.60,  # +0.05 -> rel: +0.10
        ndmi_granja=0.40,  # +0.10
        ndmi_buffer=0.30,  # +0.05 -> rel: +0.05
        ndbi_granja=-0.35, # -0.15
        ndbi_buffer=-0.20, # -0.05 -> rel: -0.10
    )

    deltas, score, riesgo, desglose, resumen = calculate_ecological_score(reciente, referencia)

    assert score == 100.0
    assert riesgo == RiskLevel.BAJO
    assert deltas.delta_ndvi_relativo == 0.10
    assert deltas.delta_ndmi_relativo == 0.05
    assert deltas.delta_ndbi_relativo == -0.10
    assert len(desglose) == 3


def test_scoring_moderate_degradation_medium_risk():
    """Escenario: Granja con pérdida leve/moderada de vegetación y aumento moderado de suelo desnudo respecto al buffer."""
    referencia = SpectralIndices(
        ndvi_granja=0.70,
        ndvi_buffer=0.65,
        ndmi_granja=0.35,
        ndmi_buffer=0.30,
        ndbi_granja=-0.25,
        ndbi_buffer=-0.20,
    )
    reciente = SpectralIndices(
        ndvi_granja=0.55,  # -0.15
        ndvi_buffer=0.65,  # 0.00  -> rel: -0.15 (penalización NDVI: min(45, 0.15*150=22.5))
        ndmi_granja=0.25,  # -0.10
        ndmi_buffer=0.30,  # 0.00  -> rel: -0.10 (penalización NDMI: min(30, 0.10*120=12.0))
        ndbi_granja=-0.15, # +0.10
        ndbi_buffer=-0.20, # 0.00  -> rel: +0.10 (penalización NDBI: min(25, 0.10*100=10.0))
    )

    deltas, score, riesgo, desglose, resumen = calculate_ecological_score(reciente, referencia)

    # Penalizaciones esperadas: 22.5 + 12.0 + 10.0 = 44.5 -> Score = 100 - 44.5 = 55.5
    assert 50.0 <= score < 75.0
    assert riesgo == RiskLevel.MEDIO
    assert "MEDIO" in resumen


def test_scoring_severe_degradation_high_risk():
    """Escenario: Granja con deforestación severa, desecación y alta exposición de suelo desnudo mientras el buffer se mantuvo."""
    referencia = SpectralIndices(
        ndvi_granja=0.80,
        ndvi_buffer=0.75,
        ndmi_granja=0.45,
        ndmi_buffer=0.40,
        ndbi_granja=-0.30,
        ndbi_buffer=-0.25,
    )
    reciente = SpectralIndices(
        ndvi_granja=0.30,  # -0.50
        ndvi_buffer=0.75,  # 0.00  -> rel: -0.50 (penalización NDVI: 45.0 max)
        ndmi_granja=0.05,  # -0.40
        ndmi_buffer=0.40,  # 0.00  -> rel: -0.40 (penalización NDMI: 30.0 max)
        ndbi_granja=0.15,  # +0.45
        ndbi_buffer=-0.25, # 0.00  -> rel: +0.45 (penalización NDBI: 25.0 max)
    )

    deltas, score, riesgo, desglose, resumen = calculate_ecological_score(reciente, referencia)

    # Penalizaciones: 45 + 30 + 25 = 100 -> Score = 0.0
    assert score == 0.0
    assert riesgo == RiskLevel.ALTO
    assert "ALTO" in resumen


def test_regional_drought_fairness():
    """Escenario: Sequía climática regional donde el buffer y la granja sufren exactamente la misma caída.

    El score no debe penalizar a la granja injustamente porque el delta relativo es 0.
    """
    referencia = SpectralIndices(
        ndvi_granja=0.70,
        ndvi_buffer=0.70,
        ndmi_granja=0.35,
        ndmi_buffer=0.35,
        ndbi_granja=-0.25,
        ndbi_buffer=-0.25,
    )
    reciente = SpectralIndices(
        ndvi_granja=0.55,  # -0.15
        ndvi_buffer=0.55,  # -0.15 -> rel: 0.0
        ndmi_granja=0.20,  # -0.15
        ndmi_buffer=0.20,  # -0.15 -> rel: 0.0
        ndbi_granja=-0.10, # +0.15
        ndbi_buffer=-0.10, # +0.15 -> rel: 0.0
    )

    deltas, score, riesgo, desglose, resumen = calculate_ecological_score(reciente, referencia)

    assert score == 100.0
    assert riesgo == RiskLevel.BAJO
