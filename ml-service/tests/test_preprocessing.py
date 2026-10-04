from datetime import date

from app.preprocessing import to_daily_series
from app.schemas import RatePoint


def test_forward_fills_gaps_weekend():
    points = [
        RatePoint(date=date(2026, 1, 2), rate=100.0),  # Jumat
        RatePoint(date=date(2026, 1, 5), rate=110.0),  # Senin (Sab/Min kosong)
    ]

    series = to_daily_series(points)

    assert len(series) == 4  # 2,3,4,5 Januari
    assert series.loc["2026-01-02"] == 100.0
    assert series.loc["2026-01-03"] == 100.0  # Sabtu, forward-fill dari Jumat
    assert series.loc["2026-01-04"] == 100.0  # Minggu
    assert series.loc["2026-01-05"] == 110.0


def test_duplicate_dates_keep_last():
    points = [
        RatePoint(date=date(2026, 1, 2), rate=100.0),
        RatePoint(date=date(2026, 1, 2), rate=999.0),
    ]

    series = to_daily_series(points)

    assert len(series) == 1
    assert series.loc["2026-01-02"] == 999.0
