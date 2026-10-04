import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { fetchHistoricalRates, fetchLatestRates } from '../src/services/frankfurter.js';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('fetchLatestRates', () => {
  test('memanggil endpoint /latest dengan base & symbols yang benar', async () => {
    let calledUrl;
    global.fetch = async (url) => {
      calledUrl = url;
      return { ok: true, json: async () => ({ amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008 } }) };
    };

    const result = await fetchLatestRates({
      apiBaseUrl: 'https://api.frankfurter.dev/v1',
      baseCurrency: 'IDR',
      targetCurrencies: ['AUD', 'EUR'],
    });

    assert.equal(calledUrl, 'https://api.frankfurter.dev/v1/latest?base=IDR&symbols=AUD%2CEUR');
    assert.deepEqual(result, { amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008 } });
  });

  test('retry sampai 3x lalu lempar error kalau terus gagal', async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      return { ok: false, status: 500, statusText: 'Internal Server Error' };
    };

    await assert.rejects(
      () =>
        fetchLatestRates({
          apiBaseUrl: 'https://api.frankfurter.dev/v1',
          baseCurrency: 'IDR',
          targetCurrencies: ['AUD'],
        }),
      /Gagal mengambil data dari Frankfurter setelah 3 percobaan/,
    );
    assert.equal(attempts, 3);
  });

  test('berhasil setelah gagal di percobaan pertama', async () => {
    let attempts = 0;
    global.fetch = async () => {
      attempts += 1;
      if (attempts === 1) {
        return { ok: false, status: 503, statusText: 'Service Unavailable' };
      }
      return { ok: true, json: async () => ({ amount: 1, base: 'IDR', date: '2026-09-24', rates: { AUD: 0.00008 } }) };
    };

    const result = await fetchLatestRates({
      apiBaseUrl: 'https://api.frankfurter.dev/v1',
      baseCurrency: 'IDR',
      targetCurrencies: ['AUD'],
    });

    assert.equal(attempts, 2);
    assert.equal(result.rates.AUD, 0.00008);
  });
});

describe('fetchHistoricalRates', () => {
  test('memanggil endpoint rentang tanggal dengan base & symbols yang benar', async () => {
    let calledUrl;
    global.fetch = async (url) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({
          amount: 1,
          base: 'IDR',
          start_date: '2026-01-01',
          end_date: '2026-01-02',
          rates: { '2026-01-01': { AUD: 0.00008 }, '2026-01-02': { AUD: 0.000081 } },
        }),
      };
    };

    const result = await fetchHistoricalRates({
      apiBaseUrl: 'https://api.frankfurter.dev/v1',
      baseCurrency: 'IDR',
      targetCurrencies: ['AUD'],
      startDate: '2026-01-01',
      endDate: '2026-01-02',
    });

    assert.equal(calledUrl, 'https://api.frankfurter.dev/v1/2026-01-01..2026-01-02?base=IDR&symbols=AUD');
    assert.equal(Object.keys(result.rates).length, 2);
  });
});
