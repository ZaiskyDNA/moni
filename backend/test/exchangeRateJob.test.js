import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { runExchangeRateFetchJob } from '../src/services/exchangeRateJob.js';

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
