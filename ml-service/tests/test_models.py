import pandas as pd
import pytest

from app.models import linear_regression, moving_average


def _series(values):
    index = pd.date_range("2026-01-01", periods=len(values), freq="D")
    return pd.Series(values, index=index)


def test_moving_average_constant_series_stays_constant():
    series = _series([100.0] * 20)

    result = moving_average.forecast(series, window=5, horizon=3)

    assert len(result) == 3
    assert list(result.values) == [100.0, 100.0, 100.0]
    assert result.index[0] == series.index[-1] + pd.Timedelta(days=1)


def test_moving_average_tracks_recent_average():
    series = _series([10.0, 20.0, 30.0, 40.0, 50.0])

    result = moving_average.forecast(series, window=5, horizon=1)

    assert result.iloc[0] == 30.0  # rata-rata 5 nilai terakhir


def test_linear_regression_extrapolates_upward_trend():
    series = _series([100.0 + 2 * i for i in range(30)])

    result = linear_regression.forecast(series, window=7, horizon=5)

    assert len(result) == 5
    assert result.iloc[-1] > result.iloc[0] > series.iloc[-1]


def test_linear_regression_raises_when_series_too_short():
    series = _series([100.0, 101.0, 102.0])

    with pytest.raises(ValueError):
        linear_regression.forecast(series, window=7, horizon=1)
