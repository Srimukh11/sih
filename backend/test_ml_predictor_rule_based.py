from backend.ml_predictor import FaultPredictor


def test_rule_based_prediction_flags_critical_gas_fault():
    predictor = FaultPredictor()
    predictor.is_trained = False

    result = predictor.predict_fault({
        "gas": 4200,
        "water_flow": 0.4,
        "water_level": 1,
        "ac_current": 1,
        "light": 300,
    })

    assert result["is_anomaly"] is True
    assert result["severity"] == "critical"
    assert result["fault_probability"] >= 0.9


def test_rule_based_prediction_keeps_normal_system_safe():
    predictor = FaultPredictor()
    predictor.is_trained = False

    result = predictor.predict_fault({
        "gas": 200,
        "water_flow": 1.2,
        "water_level": 1,
        "ac_current": 1,
        "light": 800,
    })

    assert result["is_anomaly"] is False
    assert result["severity"] == "low"
    assert result["fault_probability"] < 0.2
