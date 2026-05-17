"""
Core anomaly detection engine.

Extracts the ML inference logic from the backend into a reusable class
that can be imported and used standalone without the web server.
"""

import os
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque

from logwatch_ai.feature_translator import FeatureTranslator


class AnomalyDetector:
    """
    AI-powered Windows Event Log anomaly detector using Isolation Forest.

    Usage:
        detector = AnomalyDetector()
        result = detector.score_log(
            level="ERROR",
            message="FATAL: Database connection lost",
            log_type="Database",
        )
        print(result["is_anomaly"])  # True or False
        print(result["score"])       # e.g. -0.1234
    """

    def __init__(self, artifacts_path: str | None = None):
        """
        Load the pre-trained ML model and preprocessing artifacts.

        Args:
            artifacts_path: Path to the directory containing .pkl files.
                            If None, uses the bundled ml_artifacts/ directory.
        """
        if artifacts_path is None:
            artifacts_path = os.path.join(os.path.dirname(__file__), "ml_artifacts")

        self.model = joblib.load(os.path.join(artifacts_path, "model_final.pkl"))
        self.scaler = joblib.load(os.path.join(artifacts_path, "scaler_final.pkl"))
        self.tfidf = joblib.load(os.path.join(artifacts_path, "tfidf_final.pkl"))
        self.svd = joblib.load(os.path.join(artifacts_path, "svd_final.pkl"))
        self.features_list = joblib.load(os.path.join(artifacts_path, "features_final.pkl"))

        try:
            self.threshold = joblib.load(os.path.join(artifacts_path, "threshold_final.pkl"))
        except FileNotFoundError:
            self.threshold = -0.0900

        self.translator = FeatureTranslator(
            tfidf=self.tfidf, svd=self.svd, features_list=self.features_list
        )

        # In-memory sliding window state
        self._error_history = defaultdict(lambda: defaultdict(deque))
        self._hw_history = defaultdict(lambda: defaultdict(deque))
        self._cusum_tracker = defaultdict(lambda: defaultdict(float))
        self._ERROR_MEAN = 0.20

    def _cleanup_old_state(self, key: str, log_type: str, current_time: datetime):
        """Purge timestamps older than 60 minutes from sliding window deques."""
        cutoff = current_time - timedelta(minutes=60)

        err_dq = self._error_history[key][log_type]
        while err_dq and err_dq[0] < cutoff:
            err_dq.popleft()

        hw_dq = self._hw_history[key][log_type]
        while hw_dq and hw_dq[0][0] < cutoff:
            hw_dq.popleft()

    def score_log(
        self,
        level: str,
        message: str,
        log_type: str = "Other",
        cpu: float = 0.0,
        ram: float = 0.0,
        timestamp: datetime | None = None,
        source_key: str = "default",
    ) -> dict:
        """
        Score a single log entry for anomaly detection.

        Args:
            level: Log severity — "INFO", "WARNING", "ERROR", "CRITICAL".
            message: Raw log message text.
            log_type: Category — "Database", "Authentication", "Network",
                      "Security", "System", or "Other".
            cpu: CPU usage percentage at the time of the log (0-100).
            ram: RAM usage percentage at the time of the log (0-100).
            timestamp: When the log occurred. Defaults to now (UTC).
            source_key: Identifier to group logs from the same source
                        (used for sliding window calculations).

        Returns:
            dict with keys:
                - is_anomaly (bool): True if the log is anomalous.
                - score (float): Raw Isolation Forest decision score.
                - threshold (float): The calibrated anomaly threshold.
        """
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        is_error = 1 if level.upper() in ["ERROR", "CRITICAL", "WARNING", "FATAL"] else 0

        # --- Sliding window maintenance ---
        self._cleanup_old_state(source_key, log_type, timestamp)

        if is_error:
            self._error_history[source_key][log_type].append(timestamp)
        self._hw_history[source_key][log_type].append((timestamp, cpu, ram))

        err_dq = self._error_history[source_key][log_type]

        cnt_30s = sum(1 for t in err_dq if t >= timestamp - timedelta(seconds=30))
        cnt_1m = sum(1 for t in err_dq if t >= timestamp - timedelta(minutes=1))
        cnt_5m = sum(1 for t in err_dq if t >= timestamp - timedelta(minutes=5))
        cnt_10m = sum(1 for t in err_dq if t >= timestamp - timedelta(minutes=10))
        cnt_15m = sum(1 for t in err_dq if t >= timestamp - timedelta(minutes=15))
        cnt_60m = len(err_dq)

        # CUSUM drift tracking
        self._cusum_tracker[source_key][log_type] = max(
            0.0, self._cusum_tracker[source_key][log_type] + float(is_error) - self._ERROR_MEAN
        )
        cusum_score = self._cusum_tracker[source_key][log_type]

        # Ratio features
        short_long = (cnt_1m / cnt_60m) if cnt_60m > 0 else 0.0
        mid_long = (cnt_15m / cnt_60m) if cnt_60m > 0 else 0.0
        error_trend = (cnt_5m - cnt_15m) / 10.0
        dens_5m = cnt_5m / 5.0
        dens_15m = cnt_15m / 15.0

        # Hardware velocity
        hw_dq = self._hw_history[source_key][log_type]
        cpu_vel, ram_vel = 0.0, 0.0
        if len(hw_dq) > 1:
            oldest_ts, oldest_cpu, oldest_ram = hw_dq[0]
            time_diff = (timestamp - oldest_ts).total_seconds() / 60.0
            if time_diff > 0:
                cpu_vel = (cpu - oldest_cpu) / time_diff
                ram_vel = (ram - oldest_ram) / time_diff

        # Time features
        hour = timestamp.hour
        day = timestamp.weekday()
        hour_sin = np.sin(2 * np.pi * hour / 24.0)
        hour_cos = np.cos(2 * np.pi * hour / 24.0)
        day_sin = np.sin(2 * np.pi * day / 7.0)
        day_cos = np.cos(2 * np.pi * day / 7.0)

        # --- Build feature vector ---
        base_features = {
            "is_error": is_error,
            "Errors_Last_30s": cnt_30s,
            "Errors_Last_1_Min": cnt_1m,
            "Errors_Last_5_Min": cnt_5m,
            "Errors_Last_10_Min": cnt_10m,
            "Errors_Last_15_Min": cnt_15m,
            "Errors_Last_60_Min": cnt_60m,
            "CUSUM_Errors": cusum_score,
            "Short_Long_Ratio": short_long,
            "Mid_Long_Ratio": mid_long,
            "Error_Trend_Slope": error_trend,
            "Error_Density_5Min": dens_5m,
            "Error_Density_15Min": dens_15m,
            "CPU_Velocity": cpu_vel,
            "RAM_Velocity": ram_vel,
            "Hour_sin": hour_sin,
            "Hour_cos": hour_cos,
            "Day_sin": day_sin,
            "Day_cos": day_cos,
        }

        model_frame = self.translator.build_model_frame(
            base_features=base_features,
            log_type=log_type,
            message=message,
        )
        vector_scaled = self.scaler.transform(model_frame)
        score = float(self.model.decision_function(vector_scaled)[0])

        return {
            "is_anomaly": score < self.threshold,
            "score": round(score, 6),
            "threshold": self.threshold,
        }

    def score_batch(self, logs: list[dict]) -> list[dict]:
        """
        Score multiple log entries at once.

        Args:
            logs: List of dicts, each with keys: level, message, log_type,
                  and optionally cpu, ram, timestamp, source_key.

        Returns:
            List of result dicts (same format as score_log output).
        """
        results = []
        for log in logs:
            result = self.score_log(
                level=log["level"],
                message=log["message"],
                log_type=log.get("log_type", "Other"),
                cpu=log.get("cpu", 0.0),
                ram=log.get("ram", 0.0),
                timestamp=log.get("timestamp"),
                source_key=log.get("source_key", "default"),
            )
            results.append(result)
        return results
