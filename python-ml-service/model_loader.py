"""
ModelLoader: loads model_decision_tree.pkl, model_random_forest.pkl, scaler.pkl,
and feature_cols.pkl from the models/ directory on initialization.
"""

from pathlib import Path
import json
import joblib


class ModelLoader:
    """Load and expose the trained ML regression models, scaler, and feature columns."""

    AVAILABLE_MODELS = ["decision_tree", "random_forest"]
    DEFAULT_MODEL = "decision_tree"

    def __init__(self) -> None:
        models_dir = Path(__file__).parent / "models"

        dt_path = models_dir / "model_decision_tree.pkl"
        rf_path = models_dir / "model_random_forest.pkl"
        scaler_path = models_dir / "scaler.pkl"
        features_path = models_dir / "feature_cols.pkl"
        summary_path = models_dir / "pipeline_summary.json"

        # Check required files
        for p in [dt_path, rf_path, scaler_path, features_path]:
            if not p.exists():
                raise FileNotFoundError(
                    f"Required model file not found: {p}. "
                    "Place all model outputs in the models/ directory before starting."
                )

        # Load models and preprocessing artifacts
        self.models = {
            "decision_tree": joblib.load(dt_path),
            "random_forest": joblib.load(rf_path)
        }
        self.scaler = joblib.load(scaler_path)
        self.feature_cols = joblib.load(features_path)

        # Load summary if available
        self.summary = {}
        if summary_path.exists():
            try:
                with open(summary_path, "r") as f:
                    self.summary = json.load(f)
            except Exception:
                pass

    def get_model(self, model_type: str):
        """Dapatkan model berdasarkan tipe, fallback ke default."""
        model_type_lower = (model_type or "").lower().strip()
        return self.models.get(model_type_lower, self.models[self.DEFAULT_MODEL])

