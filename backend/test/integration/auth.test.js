import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { healthyDb, testAuthConfig } from '../helpers.js';

// Integration test memakai PostgreSQL sungguhan (service container di CI, atau database
// dari docker compose di lokal). Dilewati kalau DATABASE_URL tidak diset.
const hasDatabase = Boolean(process.env.DATABASE_URL);

// Semua user test memakai domain ini supaya bisa dibersihkan tanpa menyentuh data lain.
const TEST_DOMAIN = '@integration.test';

describe('Alur auth dengan PostgreSQL', { skip: !hasDatabase && 'DATABASE_URL tidak diset' }, () => {
  let prisma;
  let app;

  const cleanup = () => prisma.user.deleteMany({ where: { email: { endsWith: TEST_DOMAIN } } });

  before(async () => {
    ({ prisma } = await import('../../src/prisma.js'));
    app = createApp({ db: healthyDb, prisma, config: { env: 'test', auth: testAuthConfig } });
    await cleanup();
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('register → login → me → refresh → logout', async () => {
    const agent = request.agent(app);
    const credentials = { email: `budi${TEST_DOMAIN}`, password: 'rahasia123' };

    const register = await agent.post('/api/v1/auth/register').send({ name: 'Budi', ...credentials });
    assert.equal(register.status, 201);

    const stored = await prisma.user.findUnique({ where: { email: credentials.email } });
    assert.match(stored.passwordHash, /^\$argon2id\$/);

    const login = await agent.post('/api/v1/auth/login').send(credentials);
    assert.equal(login.status, 200);

    const me = await agent.get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.id, stored.id);

    assert.equal((await agent.post('/api/v1/auth/refresh')).status, 200);
    assert.equal((await agent.post('/api/v1/auth/logout')).status, 204);
    assert.equal((await agent.post('/api/v1/auth/refresh')).status, 401);
  });

  test('login dengan password salah → 401', async () => {
    const credentials = { email: `sari${TEST_DOMAIN}`, password: 'rahasia123' };
    await request(app).post('/api/v1/auth/register').send({ name: 'Sari', ...credentials });

    const res = await request(app).post('/api/v1/auth/login').send({ ...credentials, password: 'salah12345' });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('email duplikat ditolak oleh unique constraint database → 409', async () => {
    const payload = { name: 'Dewi', email: `dewi${TEST_DOMAIN}`, password: 'rahasia123' };

    // Dikirim bersamaan: tetap hanya satu yang berhasil karena dicek oleh database.
    const results = await Promise.all([
      request(app).post('/api/v1/auth/register').send(payload),
      request(app).post('/api/v1/auth/register').send(payload),
    ]);

    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  });

  test('user yang sudah dihapus tidak bisa refresh sesi', async () => {
    const agent = request.agent(app);
    const credentials = { email: `hapus${TEST_DOMAIN}`, password: 'rahasia123' };
    await agent.post('/api/v1/auth/register').send({ name: 'Hapus', ...credentials });
    await agent.post('/api/v1/auth/login').send(credentials);

    await prisma.user.delete({ where: { email: credentials.email } });

    assert.equal((await agent.post('/api/v1/auth/refresh')).status, 401);
  });
});
