import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { fakeUserPrisma, healthyDb, testAuthConfig } from './helpers.js';

const validUser = { name: 'Budi', email: 'Budi@Contoh.com', password: 'rahasia123' };

function buildApp({ prisma = fakeUserPrisma(), auth = testAuthConfig } = {}) {
  return createApp({ db: healthyDb, prisma, config: { env: 'test', auth } });
}

describe('POST /api/v1/auth/register', () => {
  test('membuat user baru tanpa mengembalikan password', async () => {
    const prisma = fakeUserPrisma();
    const res = await request(buildApp({ prisma })).post('/api/v1/auth/register').send(validUser);

    assert.equal(res.status, 201);
    assert.equal(res.body.data.user.email, 'budi@contoh.com');
    assert.equal(res.body.data.user.passwordHash, undefined);
    assert.match(prisma.users[0].passwordHash, /^\$argon2id\$/);
  });

  test('menolak payload tidak valid dengan detail per field', async () => {
    const res = await request(buildApp())
      .post('/api/v1/auth/register')
      .send({ name: '', email: 'bukan-email', password: 'pendek' });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    const fields = res.body.error.details.map((d) => d.field);
    assert.ok(['name', 'email', 'password'].every((field) => fields.includes(field)));
  });

  test('menolak password tanpa angka', async () => {
    const res = await request(buildApp())
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: 'hanyahuruf' });

    assert.equal(res.status, 400);
  });

  test('menolak email yang sudah terdaftar (409)', async () => {
    const app = buildApp();
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app).post('/api/v1/auth/register').send(validUser);

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'EMAIL_TAKEN');
  });

  test('body JSON rusak dibalas 400 dengan format error standar', async () => {
    const res = await request(buildApp())
      .post('/api/v1/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"rusak":');

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });
});

describe('POST /api/v1/auth/login', () => {
  test('mengembalikan access token dan memasang refresh token di cookie httpOnly', async () => {
    const app = buildApp();
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    assert.equal(res.status, 200);
    assert.ok(res.body.data.accessToken);
    assert.equal(res.body.data.tokenType, 'Bearer');
    const cookie = res.headers['set-cookie'].join(';');
    assert.match(cookie, /refreshToken=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  test('password salah dan email tidak terdaftar sama-sama dibalas 401 yang sama', async () => {
    const app = buildApp();
    await request(app).post('/api/v1/auth/register').send(validUser);

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: validUser.email, password: 'salah12345' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'tidakada@contoh.com', password: 'salah12345' });

    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
  });

  test('dibatasi rate limit setelah terlalu banyak percobaan', async () => {
    const app = buildApp({ auth: { ...testAuthConfig, rateLimit: { windowMs: 60_000, max: 2 } } });
    const attempt = () => request(app).post('/api/v1/auth/login').send({ email: 'a@contoh.com', password: 'x' });

    await attempt();
    await attempt();
    const res = await attempt();

    assert.equal(res.status, 429);
    assert.equal(res.body.error.code, 'TOO_MANY_REQUESTS');
  });
});

describe('sesi: /me, /refresh, /logout', () => {
  test('GET /me butuh access token yang valid', async () => {
    const app = buildApp();

    assert.equal((await request(app).get('/api/v1/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer ngasal')).status, 401);
  });

  test('login → /me → refresh → logout', async () => {
    const agent = request.agent(buildApp());
    await agent.post('/api/v1/auth/register').send(validUser);
    const login = await agent.post('/api/v1/auth/login').send({ email: validUser.email, password: validUser.password });

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.email, 'budi@contoh.com');

    const refreshed = await agent.post('/api/v1/auth/refresh');
    assert.equal(refreshed.status, 200);
    assert.ok(refreshed.body.data.accessToken);

    assert.equal((await agent.post('/api/v1/auth/logout')).status, 204);
    assert.equal((await agent.post('/api/v1/auth/refresh')).status, 401);
  });
});
