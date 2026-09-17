import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

// Database palsu: test tidak butuh PostgreSQL sungguhan, jadi cepat dan jalan di mana saja.
const healthyDb = { query: async () => ({ rows: [{ '?column?': 1 }] }) };
const brokenDb = {
  query: async () => {
    throw new Error('connection refused');
  },
};

describe('GET /api/v1/health', () => {
  test('mengembalikan 200 walaupun database mati', async () => {
    const res = await request(createApp({ db: brokenDb })).get('/api/v1/health');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

describe('GET /api/v1/health/ready', () => {
  test('mengembalikan 200 saat database bisa dihubungi', async () => {
    const res = await request(createApp({ db: healthyDb })).get('/api/v1/health/ready');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ready', database: 'up' });
  });

  test('mengembalikan 503 saat database tidak bisa dihubungi', async () => {
    const res = await request(createApp({ db: brokenDb })).get('/api/v1/health/ready');

    assert.equal(res.status, 503);
    assert.deepEqual(res.body, { status: 'not_ready', database: 'down' });
  });
});

test('route yang tidak ada mengembalikan 404 JSON', async () => {
  const res = await request(createApp({ db: healthyDb })).get('/api/v1/tidak-ada');

  assert.equal(res.status, 404);
  assert.deepEqual(res.body, { error: 'Not Found' });
});
