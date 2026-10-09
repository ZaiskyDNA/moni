import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { requestForecast } from '../src/services/forecastClient.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

const series = [
  { date: '2026-01-01', rate: 100 },
  { date: '2026-01-02', rate: 101 },
];

describe('requestForecast', () => {
  test('mengembalikan body ml-service kalau sukses', async () => {
    let calledUrl;
    let calledBody;
    global.fetch = async (url, init) => {
      calledUrl = url;
      calledBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ model: 'linear_regression', predictions: [] }) };
    };

    const result = await requestForecast({
      serviceUrl: 'http://ml-service:8000',
      series,
      horizon: 7,
      model: 'linear_regression',
      window: 7,
    });

    assert.equal(calledUrl, 'http://ml-service:8000/forecast');
    assert.deepEqual(calledBody, { series, horizon: 7, model: 'linear_regression', window: 7 });
    assert.deepEqual(result, { model: 'linear_regression', predictions: [] });
  });

  test('meneruskan error 422 dari ml-service (detail string) tanpa retry', async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return { ok: false, status: 422, json: async () => ({ detail: 'window harus lebih kecil dari data' }) };
    };

    await assert.rejects(
      () => requestForecast({ serviceUrl: 'http://ml-service:8000', series, horizon: 7, model: 'linear_regression', window: 7 }),
      (err) => {
        assert.equal(err.status, 422);
        assert.equal(err.message, 'window harus lebih kecil dari data');
        return true;
      },
    );
    assert.equal(attempts, 1); // error dari ml-service tidak di-retry
  });

  test('meneruskan error 422 dari ml-service (detail array pydantic)', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({ detail: [{ msg: 'series butuh minimal 2 titik data' }] }),
    });

    await assert.rejects(
      () => requestForecast({ serviceUrl: 'http://ml-service:8000', series, horizon: 7, model: 'linear_regression', window: 7 }),
      (err) => {
        assert.equal(err.status, 422);
        assert.match(err.message, /minimal 2 titik data/);
        return true;
      },
    );
  });

  test('retry lalu balas 503 kalau ml-service tidak bisa dihubungi', async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      throw new Error('connection refused');
    };

    await assert.rejects(
      () => requestForecast({ serviceUrl: 'http://ml-service:8000', series, horizon: 7, model: 'linear_regression', window: 7 }),
      (err) => {
        assert.equal(err.status, 503);
        assert.equal(err.code, 'FORECAST_SERVICE_UNAVAILABLE');
        return true;
      },
    );
    assert.equal(attempts, 2);
  });
});
