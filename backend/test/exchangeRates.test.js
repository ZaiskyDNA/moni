import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

const healthyDb = { query: async () => ({ rows: [{ '?column?': 1 }] }) };

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
