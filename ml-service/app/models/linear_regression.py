import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from app.models.base import iterative_forecast


def forecast(series: pd.Series, window: int, horizon: int) -> pd.Series:
    """Baseline Simple Linear Regression dengan windowing/lagging (docs/ML_Architecture.md
    3.2-3.3): `window` hari terakhir jadi fitur (X) untuk memprediksi 1 hari berikutnya (y).
    """
    values = series.values.astype(float)
    if len(values) <= window:
        raise ValueError(f"Data historis ({len(values)} titik) harus lebih panjang dari window ({window})")

    x_train = np.array([values[i - window : i] for i in range(window, len(values))])
    y_train = np.array([values[i] for i in range(window, len(values))])
    model = LinearRegression().fit(x_train, y_train)

    def predict_next(history: list[float]) -> float:
        return float(model.predict([history])[0])

    return iterative_forecast(series, window, horizon, predict_next)
