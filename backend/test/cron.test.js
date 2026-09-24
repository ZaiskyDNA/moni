import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

const healthyDb = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function baseConfig(internalCronSecret) {
  return {
    exchangeRate: {
      apiBaseUrl: 'https://api.frankfurter.dev/v1',
      baseCurrency: 'IDR',
      trackedCurrencies: ['AUD'],
      source: 'frankfurter',
      internalCronSecret,
    },
  };
}

function fakePrisma() {
  return {
    exchangeRate: { upsert: async (args) => ({ id: 'fake', ...args.create }) },
    $transaction: (promises) => Promise.all(promises),
  };
}

describe('POST /api/v1/internal/cron/fetch-exchange-rate', () => {
  test('jalan tanpa secret kalau INTERNAL_CRON_SECRET belum diset', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008 } }),
    });

    const res = await request(createApp({ db: healthyDb, prisma: fakePrisma(), config: baseConfig(undefined) })).post(
      '/api/v1/internal/cron/fetch-exchange-rate',
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.savedCount, 1);
  });

  test('menolak request tanpa header secret yang benar', async () => {
    const res = await request(createApp({ db: healthyDb, prisma: fakePrisma(), config: baseConfig('rahasia') })).post(
      '/api/v1/internal/cron/fetch-exchange-rate',
    );

    assert.equal(res.status, 401);
  });

  test('menerima request dengan header secret yang benar', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008 } }),
    });

    const res = await request(createApp({ db: healthyDb, prisma: fakePrisma(), config: baseConfig('rahasia') }))
      .post('/api/v1/internal/cron/fetch-exchange-rate')
      .set('x-internal-cron-secret', 'rahasia');

    assert.equal(res.status, 200);
  });
});
