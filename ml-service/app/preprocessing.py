import pandas as pd


def to_daily_series(points) -> pd.Series:
    """Ubah titik data (tanggal, rate) jadi pandas Series harian.

    Hari tanpa data (libur bursa/weekend) diisi lewat forward fill — pakai nilai hari
    kerja terakhir (docs/ML_Architecture.md 3.2: "Handling Missing Values").
    """
    df = pd.DataFrame({"date": [p.date for p in points], "rate": [p.rate for p in points]})
    df["date"] = pd.to_datetime(df["date"])
    df = df.drop_duplicates(subset="date", keep="last").set_index("date").sort_index()

    full_index = pd.date_range(df.index.min(), df.index.max(), freq="D")
    series = df["rate"].reindex(full_index).ffill()
    series.index.name = "date"
    return series


def future_date_index(series: pd.Series, horizon: int) -> pd.DatetimeIndex:
    last_date = series.index[-1]
    return pd.date_range(last_date + pd.Timedelta(days=1), periods=horizon, freq="D")
