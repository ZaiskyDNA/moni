import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { healthyDb, testAuthConfig } from './helpers.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('GET /api/v1/exchange-rates/latest', () => {
  test('mengembalikan kurs terbaru per pasangan mata uang', async () => {
    const fakeRates = [
      { id: '1', baseCurrency: 'IDR', targetCurrency: 'AUD', rate: 0.00008, date: new Date('2026-09-24'), source: 'frankfurter' },
      { id: '2', baseCurrency: 'IDR', targetCurrency: 'EUR', rate: 0.00005, date: new Date('2026-09-24'), source: 'frankfurter' },
    ];
    const fakePrisma = { exchangeRate: { findMany: async () => fakeRates } };

    const res = await request(createApp({ db: healthyDb, prisma: fakePrisma })).get('/api/v1/exchange-rates/latest');

    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.data[0].targetCurrency, 'AUD');
  });
});

describe('GET /api/v1/exchange-rates/forecast', () => {
  const token = signAccessToken({ id: 'user-1', email: 'user@test.com' }, testAuthConfig);

  function fakeHistory() {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `rate-${i}`,
      baseCurrency: 'IDR',
      targetCurrency: 'AUD',
      date: new Date(Date.UTC(2026, 0, i + 1)),
      source: 'frankfurter',
      rate: { toNumber: () => 0.00008 + i * 0.000001 },
    }));
  }

  // Query asli pakai orderBy date 'desc'; fake ini ikut simulasikan supaya .reverse() di
  // route (yang mengembalikan ke urutan ascending untuk ml-service) teruji dengan benar.
  function buildApp(prisma = { exchangeRate: { findMany: async () => fakeHistory().reverse() } }) {
    return createApp({ db: healthyDb, prisma, config: { env: 'test', auth: testAuthConfig } });
  }

  test('menolak tanpa access token (401)', async () => {
    const res = await request(buildApp()).get('/api/v1/exchange-rates/forecast?target=AUD');
    assert.equal(res.status, 401);
  });

  test('menolak mata uang yang tidak dipantau (400)', async () => {
    const res = await request(buildApp())
      .get('/api/v1/exchange-rates/forecast?target=XYZ')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'UNKNOWN_CURRENCY');
  });

  test('memanggil ml-service dengan histori dari database dan meneruskan hasilnya', async () => {
    let requestedBody;
    global.fetch = async (url, init) => {
      requestedBody = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({ model: 'linear_regression', window: 7, horizon: 7, predictions: [], evaluation: {} }),
      };
    };

    const res = await request(buildApp())
      .get('/api/v1/exchange-rates/forecast?target=aud&horizon=5')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.model, 'linear_regression');
    assert.equal(requestedBody.horizon, 5);
    assert.equal(requestedBody.series.length, 10);
    assert.deepEqual(requestedBody.series[0], { date: '2026-01-01', rate: 0.00008 });
  });

  test('meneruskan error validasi dari ml-service (mis. data historis terlalu sedikit)', async () => {
    global.fetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Data historis harus lebih panjang dari window' }),
    });

    const res = await request(buildApp())
      .get('/api/v1/exchange-rates/forecast?target=AUD')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 422);
    assert.match(res.body.error.message, /lebih panjang dari window/);
  });
});
