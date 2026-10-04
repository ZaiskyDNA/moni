import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';
import { fakeGoalPrisma, healthyDb, testAuthConfig } from './helpers.js';

const userA = { id: 'user-a', email: 'a@contoh.com' };
const userB = { id: 'user-b', email: 'b@contoh.com' };
const bearer = (user) => `Bearer ${signAccessToken(user, testAuthConfig)}`;

const validGoal = { destinationCountry: 'Australia', targetCurrency: 'AUD', targetDate: '2099-01-31', targetAmount: '25000.50' };

function setup() {
  const prisma = fakeGoalPrisma();
  const app = createApp({ db: healthyDb, prisma, config: { env: 'test', auth: testAuthConfig } });
  const as = (user) => ({
    post: (path, body) => request(app).post(path).set('Authorization', bearer(user)).send(body),
    get: (path) => request(app).get(path).set('Authorization', bearer(user)),
    put: (path, body) => request(app).put(path).set('Authorization', bearer(user)).send(body),
    delete: (path) => request(app).delete(path).set('Authorization', bearer(user)),
  });
  return { prisma, app, as };
}

describe('/api/v1/goals', () => {
  test('semua endpoint butuh access token', async () => {
    const { app } = setup();

    for (const [method, path] of [['get', '/api/v1/goals'], ['post', '/api/v1/goals'], ['get', '/api/v1/goals/x'], ['put', '/api/v1/goals/x'], ['delete', '/api/v1/goals/x']]) {
      const res = await request(app)[method](path);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${path}`);
    }
  });

  test('POST membuat goal milik user dari token, bukan dari body', async () => {
    const { prisma, as } = setup();

    const res = await as(userA).post('/api/v1/goals', { ...validGoal, userId: userB.id });

    assert.equal(res.status, 201);
    assert.deepEqual(
      { ...res.body.data.goal, id: undefined, createdAt: undefined, updatedAt: undefined },
      { ...validGoal, id: undefined, status: 'ACTIVE', createdAt: undefined, updatedAt: undefined },
    );
    assert.equal(prisma.goals[0].userId, userA.id);
  });

  test('POST dengan data tidak valid → 400 VALIDATION_ERROR', async () => {
    const { as } = setup();

    const res = await as(userA).post('/api/v1/goals', { ...validGoal, targetCurrency: 'XYZ', targetDate: '2020-01-01' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(res.body.error.details.map((d) => d.field).sort(), ['targetCurrency', 'targetDate']);
  });

  test('mendukung banyak goal per user dan hanya menampilkan milik sendiri', async () => {
    const { as } = setup();
    await as(userA).post('/api/v1/goals', validGoal);
    await as(userA).post('/api/v1/goals', { ...validGoal, targetCurrency: 'JPY', targetDate: '2098-06-01' });
    await as(userB).post('/api/v1/goals', validGoal);

    const res = await as(userA).get('/api/v1/goals');

    assert.equal(res.status, 200);
    // Diurutkan dari tanggal target terdekat.
    assert.deepEqual(res.body.data.goals.map((g) => g.targetCurrency), ['JPY', 'AUD']);
  });

  test('goal milik user lain dibalas 404 untuk GET, PUT, dan DELETE', async () => {
    const { prisma, as } = setup();
    const created = await as(userA).post('/api/v1/goals', validGoal);
    const path = `/api/v1/goals/${created.body.data.goal.id}`;

    assert.equal((await as(userB).get(path)).status, 404);
    assert.equal((await as(userB).put(path, { targetAmount: '1' })).status, 404);
    assert.equal((await as(userB).delete(path)).status, 404);
    assert.equal(prisma.goals[0].targetAmount, '25000.50');
    assert.equal(prisma.goals[0].status, 'ACTIVE');
  });

  test('PUT mengubah sebagian field', async () => {
    const { as } = setup();
    const created = await as(userA).post('/api/v1/goals', validGoal);

    const res = await as(userA).put(`/api/v1/goals/${created.body.data.goal.id}`, { targetAmount: 30000, destinationCountry: null });

    assert.equal(res.status, 200);
    assert.equal(res.body.data.goal.targetAmount, '30000');
    assert.equal(res.body.data.goal.destinationCountry, null);
    assert.equal(res.body.data.goal.targetCurrency, 'AUD');
  });

  test('DELETE adalah soft-delete: status CANCELLED, tersembunyi dari list default', async () => {
    const { prisma, as } = setup();
    const created = await as(userA).post('/api/v1/goals', validGoal);
    const path = `/api/v1/goals/${created.body.data.goal.id}`;

    assert.equal((await as(userA).delete(path)).status, 204);
    // Idempotent: membatalkan ulang tetap 204.
    assert.equal((await as(userA).delete(path)).status, 204);

    assert.equal(prisma.goals.length, 1);
    assert.equal((await as(userA).get(path)).body.data.goal.status, 'CANCELLED');
    assert.equal((await as(userA).get('/api/v1/goals')).body.data.goals.length, 0);
    assert.equal((await as(userA).get('/api/v1/goals?status=cancelled')).body.data.goals.length, 1);
  });

  test('goal yang dibatalkan tidak bisa diubah (409)', async () => {
    const { as } = setup();
    const created = await as(userA).post('/api/v1/goals', validGoal);
    const path = `/api/v1/goals/${created.body.data.goal.id}`;
    await as(userA).delete(path);

    const res = await as(userA).put(path, { targetAmount: '1' });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'GOAL_CANCELLED');
  });

  test('filter ?status yang tidak dikenal → 400', async () => {
    const { as } = setup();

    assert.equal((await as(userA).get('/api/v1/goals?status=SELESAI')).status, 400);
  });
});
