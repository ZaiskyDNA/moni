import numpy as np
import pandas as pd

from app.models.base import iterative_forecast


def forecast(series: pd.Series, window: int, horizon: int) -> pd.Series:
    """Baseline Moving Average (docs/ML_Architecture.md 3.3): nilai hari berikutnya =
    rata-rata `window` hari terakhir."""
    return iterative_forecast(series, window, horizon, lambda history: float(np.mean(history)))
