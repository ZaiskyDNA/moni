from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator

ModelName = Literal["moving_average", "linear_regression"]


class RatePoint(BaseModel):
    date: date
    rate: float = Field(gt=0)


class ForecastRequest(BaseModel):
    # Histori kurs harian (hasil FR-05, lihat backend/prisma/schema.prisma -> ExchangeRate).
    # Service ini sengaja tidak terhubung ke database — backend Node yang mengirim datanya,
    # supaya microservice tetap stateless dan tidak perlu kredensial DB sendiri.
    series: list[RatePoint]
    horizon: int = Field(default=7, ge=1, le=30)
    model: ModelName = "linear_regression"
    # Lookback window untuk windowing/lagging (docs/ML_Architecture.md 3.2). Default 7 hari.
    window: int = Field(default=7, ge=2, le=60)

    @field_validator("series")
    @classmethod
    def validate_series(cls, points: list[RatePoint]) -> list[RatePoint]:
        if len(points) < 2:
            raise ValueError("series butuh minimal 2 titik data")
        return sorted(points, key=lambda p: p.date)


class PredictedPoint(BaseModel):
    date: date
    predicted_rate: float


class EvaluationResult(BaseModel):
    # None kalau data historis tidak cukup panjang untuk backtest (lihat app/evaluation.py).
    mape: float | None
    rmse: float | None
    test_size: int


class ForecastResponse(BaseModel):
    model: ModelName
    window: int
    horizon: int
    predictions: list[PredictedPoint]
    # MAPE/RMSE dari backtest internal (docs/ML_Architecture.md 3.4) — bukan evaluasi pada
    # masa depan sungguhan, karena ground truth-nya belum ada.
    evaluation: EvaluationResult
