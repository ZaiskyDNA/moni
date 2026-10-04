from typing import Callable

import pandas as pd

from app.preprocessing import future_date_index


def iterative_forecast(
    series: pd.Series,
    window: int,
    horizon: int,
    predict_next: Callable[[list[float]], float],
) -> pd.Series:
    """Forecast multi-step dengan cara walk-forward: prediksi 1 langkah, lalu masukkan
    hasilnya ke history supaya bisa jadi input prediksi langkah berikutnya. Baseline
    sederhana (tanpa model seq2seq) — cukup untuk MVP sesuai docs/ML_Architecture.md 3.3.
    """
    history = list(series.values[-window:].astype(float))
    predictions = []
    for _ in range(horizon):
        next_value = predict_next(history[-window:])
        predictions.append(next_value)
        history.append(next_value)

    return pd.Series(predictions, index=future_date_index(series, horizon))
