import numpy as np
import pandas as pd

from app.models import MODEL_REGISTRY


def mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs((actual - predicted) / actual)) * 100)


def rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.sqrt(np.mean((actual - predicted) ** 2)))


def backtest(series: pd.Series, model_name: str, window: int, horizon: int):
    """Evaluasi model dengan menyisihkan hingga `horizon` hari terakhir sebagai test set,
    forecast dari sisa data, lalu bandingkan ke nilai aktual (docs/ML_Architecture.md 3.4:
    target MAPE < 2% untuk horizon 3-7 hari). Mengembalikan (mape, rmse, test_size); kalau
    data historis tidak cukup panjang untuk backtest yang berarti, kembalikan (None, None, 0).
    """
    test_size = min(horizon, len(series) - window - 1)
    if test_size <= 0:
        return None, None, 0

    train = series.iloc[:-test_size]
    actual = series.iloc[-test_size:]

    forecast_fn = MODEL_REGISTRY[model_name]
    predicted = forecast_fn(train, window, test_size)

    actual_values = actual.to_numpy(dtype=float)
    predicted_values = predicted.to_numpy(dtype=float)[: len(actual_values)]

    return mape(actual_values, predicted_values), rmse(actual_values, predicted_values), test_size
