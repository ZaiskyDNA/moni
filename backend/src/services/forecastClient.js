import { HttpError } from '../lib/errors.js';

// Klien ke ml-service (FR-06, lihat ml-service/README.md). Beda dari frankfurter.js:
// ini layanan internal kita sendiri, jadi error 4xx (validasi) diteruskan apa adanya ke
// caller -- cuma kegagalan koneksi/timeout yang di-retry.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;
const TIMEOUT_MS = 10_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Body error FastAPI bisa berupa string (HTTPException manual) atau array issue pydantic.
function extractDetailMessage(detail) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((issue) => issue.msg ?? JSON.stringify(issue)).join('; ');
  return 'Forecasting service menolak permintaan';
}

export async function requestForecast({ serviceUrl, series, horizon, model, window }) {
  const url = `${serviceUrl.replace(/\/+$/, '')}/forecast`;
  const body = JSON.stringify({ series, horizon, model, window });

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        // Error dari ml-service sendiri (bukan kegagalan koneksi) -- jangan di-retry.
        throw new HttpError(
          res.status,
          'FORECAST_SERVICE_ERROR',
          extractDetailMessage(payload?.detail),
          payload?.detail,
        );
      }

      return payload;
    } catch (err) {
      if (err instanceof HttpError) throw err;
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  throw new HttpError(503, 'FORECAST_SERVICE_UNAVAILABLE', 'Forecasting service tidak dapat dihubungi', {
    cause: lastError?.message,
  });
}
