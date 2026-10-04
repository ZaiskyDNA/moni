import numpy as np
import pandas as pd

from app.evaluation import backtest, mape, rmse


def test_mape_and_rmse_zero_for_perfect_prediction():
    actual = np.array([100.0, 200.0])
    predicted = np.array([100.0, 200.0])

    assert mape(actual, predicted) == 0
    assert rmse(actual, predicted) == 0


def test_backtest_returns_none_when_series_too_short():
    index = pd.date_range("2026-01-01", periods=5, freq="D")
    series = pd.Series([100.0] * 5, index=index)

    result = backtest(series, "moving_average", window=5, horizon=7)

    assert result == (None, None, 0)


def test_backtest_moving_average_perfect_on_constant_series():
    index = pd.date_range("2026-01-01", periods=20, freq="D")
    series = pd.Series([100.0] * 20, index=index)

    mape_value, rmse_value, test_size = backtest(series, "moving_average", window=5, horizon=7)

    assert test_size == 7
    assert mape_value == 0
    assert rmse_value == 0
