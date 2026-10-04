# MONI — Forecasting Service (FR-06)

Microservice Python/FastAPI untuk memprediksi tren kurs jangka pendek (lihat
`docs/ML_Architecture.md` bagian 2-3). Dipisah dari backend Node supaya dependency berat
(pandas, numpy, scikit-learn) tidak membebani image backend utama.

Service ini **stateless** — tidak terhubung ke database. Backend Node yang mengirim histori
kurs (hasil FR-05) lewat body request; service ini murni melakukan preprocessing + forecasting
di atas data yang dikirim.

## Model baseline

Dua model baseline sesuai `docs/ML_Architecture.md` 3.3, dipilih lewat field `model`:

- `linear_regression` (default) — regresi linear dengan windowing/lagging: `window` hari
  terakhir jadi fitur untuk memprediksi 1 hari ke depan (scikit-learn `LinearRegression`).
- `moving_average` — prediksi hari berikutnya = rata-rata `window` hari terakhir.

Keduanya melakukan forecast multi-hari secara *walk-forward* (hasil prediksi dimasukkan balik
ke history untuk memprediksi hari selanjutnya).

## Menjalankan lokal (tanpa Docker)

```bash
cd ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

## Test

```bash
python -m pytest
```

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/forecast` | Forecast kurs dari histori yang dikirim, lihat contoh di bawah |

### Contoh request `/forecast`

```json
{
  "series": [
    { "date": "2026-09-01", "rate": 0.000079 },
    { "date": "2026-09-02", "rate": 0.0000791 }
  ],
  "horizon": 7,
  "model": "linear_regression",
  "window": 7
}
```

`series` minimal 2 titik dan harus lebih panjang dari `window` (setelah hari libur/weekend
di-forward-fill, lihat `app/preprocessing.py`). Respons berisi `predictions` (tanggal + nilai
prediksi) dan `evaluation` (MAPE/RMSE dari backtest internal — target PRD: MAPE < 2% untuk
horizon 3-7 hari, lihat `docs/ML_Architecture.md` 3.4).

## Docker

```bash
# dari root project, sebagai bagian dari stack penuh
docker compose up --build ml-service
```

Target `dev` (default, auto-reload) dan `production` tersedia, sama seperti `backend/Dockerfile`.
