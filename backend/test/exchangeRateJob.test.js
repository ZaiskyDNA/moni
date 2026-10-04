import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { runExchangeRateBackfillJob, runExchangeRateFetchJob } from '../src/services/exchangeRateJob.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

function fakeConfig() {
  return {
    exchangeRate: {
      apiBaseUrl: 'https://api.frankfurter.dev/v1',
      baseCurrency: 'IDR',
      trackedCurrencies: ['AUD', 'EUR'],
      source: 'frankfurter',
    },
  };
}

describe('runExchangeRateFetchJob', () => {
  test('upsert satu baris per target currency dan kembalikan ringkasan', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008, EUR: 0.00005 } }),
    });

    const upsertCalls = [];
    const fakePrisma = {
      exchangeRate: {
        upsert: async (args) => {
          upsertCalls.push(args);
          return { id: `${args.create.targetCurrency}-id`, ...args.create };
        },
      },
      $transaction: (promises) => Promise.all(promises),
    };

    const result = await runExchangeRateFetchJob({ prisma: fakePrisma, config: fakeConfig() });

    assert.equal(upsertCalls.length, 2);
    assert.deepEqual(
      upsertCalls.map((c) => c.where.baseCurrency_targetCurrency_date),
      [
        { baseCurrency: 'IDR', targetCurrency: 'AUD', date: new Date('2026-09-24') },
        { baseCurrency: 'IDR', targetCurrency: 'EUR', date: new Date('2026-09-24') },
      ],
    );
    assert.equal(upsertCalls[0].create.rate, 0.00008);
    assert.equal(upsertCalls[0].create.source, 'frankfurter');
    assert.deepEqual(result, { date: '2026-09-24', baseCurrency: 'IDR', source: 'frankfurter', savedCount: 2 });
  });

  test('meneruskan error kalau Frankfurter gagal terus (retry habis)', async () => {
    global.fetch = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const fakePrisma = {
      exchangeRate: { upsert: async () => {} },
      $transaction: (promises) => Promise.all(promises),
    };

    await assert.rejects(() => runExchangeRateFetchJob({ prisma: fakePrisma, config: fakeConfig() }));
  });
});

describe('runExchangeRateBackfillJob', () => {
  test('upsert satu baris per (tanggal, target currency) dan lapor progres per chunk', async () => {
    const days = {};
    for (let i = 1; i <= 5; i += 1) {
      days[`2026-01-0${i}`] = { AUD: 0.00008 + i, EUR: 0.00005 + i };
    }
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ amount: 1, base: 'IDR', start_date: '2026-01-01', end_date: '2026-01-05', rates: days }),
    });

    const upsertCalls = [];
    const fakePrisma = {
      exchangeRate: {
        upsert: async (args) => {
          upsertCalls.push(args);
          return { id: 'fake', ...args.create };
        },
      },
      $transaction: (promises) => Promise.all(promises),
    };

    const progressCalls = [];
    const result = await runExchangeRateBackfillJob({
      prisma: fakePrisma,
      config: fakeConfig(),
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      onProgress: (p) => progressCalls.push(p),
    });

    assert.equal(upsertCalls.length, 10); // 5 hari x 2 target currency
    assert.deepEqual(result, {
      startDate: '2026-01-01',
      endDate: '2026-01-05',
      baseCurrency: 'IDR',
      source: 'frankfurter',
      dayCount: 5,
      savedCount: 10,
    });
    // Seluruh baris masuk satu chunk (di bawah BACKFILL_CHUNK_SIZE), jadi progres dilapor sekali.
    assert.deepEqual(progressCalls, [{ savedCount: 10, totalCount: 10 }]);
  });

  test('meneruskan error kalau Frankfurter gagal terus (retry habis)', async () => {
    global.fetch = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const fakePrisma = {
      exchangeRate: { upsert: async () => {} },
      $transaction: (promises) => Promise.all(promises),
    };

    await assert.rejects(() =>
      runExchangeRateBackfillJob({
        prisma: fakePrisma,
        config: fakeConfig(),
        startDate: '2026-01-01',
        endDate: '2026-01-05',
      }),
    );
  });
});
