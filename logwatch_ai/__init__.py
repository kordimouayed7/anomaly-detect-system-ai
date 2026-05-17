"""
logwatch-ai — AI-powered Windows Event Log Anomaly Detection

Usage:
    from logwatch_ai import AnomalyDetector

    detector = AnomalyDetector()
    result = detector.score_log(
        level="ERROR",
        message="FATAL: Database connection lost",
        log_type="Database",
    )
    print(result)
    # {"is_anomaly": True, "score": -0.1234, "threshold": -0.09}
"""

from logwatch_ai.detector import AnomalyDetector

__version__ = "1.0.0"
__all__ = ["AnomalyDetector"]
