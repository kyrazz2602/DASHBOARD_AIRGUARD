"""
ModelLoader: loads best_model.pkl, scaler.pkl, and optionally label_encoder.pkl
from the models/ directory on initialization.
"""

from pathlib import Path

import joblib


class ModelLoader:
    """Load and expose the trained ML model, scaler, and optional label encoder."""

    # Fallback label map jika label_encoder.pkl tidak ada
    # Urutan alphabetical: Aman=0, Ganti Filter=1, Perhatian=2
    # (sklearn LabelEncoder mengurutkan secara alphabetical)
    LABEL_MAP = {0: "Aman", 1: "Ganti Filter", 2: "Perhatian"}

    def __init__(self) -> None:
        models_dir = Path(__file__).parent / "models"

        model_path  = models_dir / "best_model.pkl"
        scaler_path = models_dir / "scaler.pkl"
        le_path     = models_dir / "label_encoder.pkl"

        if not model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {model_path}. "
                "Place best_model.pkl in the models/ directory before starting the service."
            )

        if not scaler_path.exists():
            raise FileNotFoundError(
                f"Scaler file not found: {scaler_path}. "
                "Place scaler.pkl in the models/ directory before starting the service."
            )

        self.model  = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)

        # Label encoder opsional — jika tidak ada, gunakan LABEL_MAP
        if le_path.exists():
            self.label_encoder = joblib.load(le_path)
        else:
            self.label_encoder = None

    def decode_label(self, idx: int) -> str:
        """Konversi index prediksi ke label string."""
        if self.label_encoder is not None:
            return str(self.label_encoder.inverse_transform([idx])[0])
        return self.LABEL_MAP.get(int(idx), str(idx))

    def get_class_labels(self) -> list[str]:
        """Kembalikan daftar label sesuai urutan index."""
        if self.label_encoder is not None:
            return [str(c) for c in self.label_encoder.classes_]
        return list(self.LABEL_MAP.values())
