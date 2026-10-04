from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app import evaluation, preprocessing
from app.config import CORS_ORIGIN
from app.models import MODEL_REGISTRY
from app.schemas import EvaluationResult, ForecastRequest, ForecastResponse, PredictedPoint

app = FastAPI(title="MONI Forecasting Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if CORS_ORIGIN == "*" else CORS_ORIGIN.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(payload: ForecastRequest):
    series = preprocessing.to_daily_series(payload.series)

    if len(series) <= payload.window:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Data historis ({len(series)} hari setelah forward-fill) harus lebih "
                f"panjang dari window ({payload.window})"
            ),
        )

    forecast_fn = MODEL_REGISTRY[payload.model]
    predicted = forecast_fn(series, payload.window, payload.horizon)
    mape_value, rmse_value, test_size = evaluation.backtest(series, payload.model, payload.window, payload.horizon)

    return ForecastResponse(
        model=payload.model,
        window=payload.window,
        horizon=payload.horizon,
        predictions=[
            PredictedPoint(date=index.date(), predicted_rate=value) for index, value in predicted.items()
        ],
        evaluation=EvaluationResult(mape=mape_value, rmse=rmse_value, test_size=test_size),
    )
