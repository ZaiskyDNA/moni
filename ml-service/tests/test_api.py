from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _series_payload(days=20, start_rate=100.0):
    start = date(2026, 1, 1)
    return [{"date": str(start + timedelta(days=i)), "rate": start_rate + i} for i in range(days)]


def test_health():
    res = client.get("/health")

    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_forecast_linear_regression_default():
    res = client.post("/forecast", json={"series": _series_payload()})

    assert res.status_code == 200
    body = res.json()
    assert body["model"] == "linear_regression"
    assert len(body["predictions"]) == 7
    assert body["evaluation"]["test_size"] > 0


def test_forecast_moving_average():
    res = client.post(
        "/forecast",
        json={"series": _series_payload(), "model": "moving_average", "window": 5, "horizon": 3},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["model"] == "moving_average"
    assert len(body["predictions"]) == 3


def test_forecast_rejects_series_too_short_for_window():
    res = client.post("/forecast", json={"series": _series_payload(days=3), "window": 7, "horizon": 1})

    assert res.status_code == 422


def test_forecast_rejects_too_few_points():
    res = client.post("/forecast", json={"series": [{"date": "2026-01-01", "rate": 100.0}]})

    assert res.status_code == 422  # validasi pydantic: series butuh minimal 2 titik
