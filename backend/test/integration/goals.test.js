import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { healthyDb, testAuthConfig } from '../helpers.js';

const hasDatabase = Boolean(process.env.DATABASE_URL);

// Domain berbeda dari auth.test.js: file test berjalan paralel, dan cleanup auth
// (`endsWith '@integration.test'`) tidak boleh menghapus user milik test ini.
const TEST_DOMAIN = '@goals-integration.test';

describe('Alur auth → goal dengan PostgreSQL', { skip: !hasDatabase && 'DATABASE_URL tidak diset' }, () => {
  let prisma;
  let app;

  const cleanup = () => prisma.user.deleteMany({ where: { email: { endsWith: TEST_DOMAIN } } });

  // Register + login lewat API sungguhan, kembalikan header Authorization-nya.
  async function login(name) {
    const credentials = { email: `${name}${TEST_DOMAIN}`, password: 'rahasia123' };
    await request(app).post('/api/v1/auth/register').send({ name, ...credentials });
    const res = await request(app).post('/api/v1/auth/login').send(credentials);
    return `Bearer ${res.body.data.accessToken}`;
  }

  before(async () => {
    ({ prisma } = await import('../../src/prisma.js'));
    app = createApp({ db: healthyDb, prisma, config: { env: 'test', auth: testAuthConfig } });
    await cleanup();
  });

  after(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  test('register → login → create → list → update → cancel', async () => {
    const auth = await login('rina');

    const created = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', auth)
      .send({ destinationCountry: 'Jepang', targetCurrency: 'jpy', targetDate: '2099-04-01', targetAmount: '350000.75' });
    assert.equal(created.status, 201);
    const { id } = created.body.data.goal;

    // Nominal tersimpan presisi di kolom Decimal(14,2), tanggal di kolom DATE.
    const stored = await prisma.goal.findUnique({ where: { id }, include: { user: true } });
    assert.equal(stored.targetAmount.toString(), '350000.75');
    assert.equal(stored.targetCurrency, 'JPY');
    assert.equal(stored.targetDate.toISOString(), '2099-04-01T00:00:00.000Z');
    assert.equal(stored.user.email, `rina${TEST_DOMAIN}`);

    const list = await request(app).get('/api/v1/goals?status=ACTIVE').set('Authorization', auth);
    assert.deepEqual(list.body.data.goals.map((g) => g.id), [id]);

    const updated = await request(app)
      .put(`/api/v1/goals/${id}`)
      .set('Authorization', auth)
      .send({ targetDate: '2099-05-01' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.goal.targetDate, '2099-05-01');
    assert.equal(updated.body.data.goal.targetAmount, '350000.75');

    assert.equal((await request(app).delete(`/api/v1/goals/${id}`).set('Authorization', auth)).status, 204);
    assert.equal((await prisma.goal.findUnique({ where: { id } })).status, 'CANCELLED');
    assert.equal((await request(app).get('/api/v1/goals').set('Authorization', auth)).body.data.goals.length, 0);
  });

  test('user B tidak bisa membaca, mengubah, atau membatalkan goal user A', async () => {
    const authA = await login('andi');
    const authB = await login('bayu');

    const created = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', authA)
      .send({ targetCurrency: 'USD', targetDate: '2099-12-31', targetAmount: '5000' });
    const path = `/api/v1/goals/${created.body.data.goal.id}`;

    assert.equal((await request(app).get(path).set('Authorization', authB)).status, 404);
    assert.equal((await request(app).put(path).set('Authorization', authB).send({ targetAmount: '1' })).status, 404);
    assert.equal((await request(app).delete(path).set('Authorization', authB)).status, 404);
    assert.equal((await request(app).get('/api/v1/goals').set('Authorization', authB)).body.data.goals.length, 0);

    const stored = await prisma.goal.findUnique({ where: { id: created.body.data.goal.id } });
    assert.equal(stored.status, 'ACTIVE');
    assert.equal(stored.targetAmount.toString(), '5000');
  });

  test('menghapus user ikut menghapus goal-nya (onDelete: Cascade)', async () => {
    const auth = await login('cascade');
    const created = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', auth)
      .send({ targetCurrency: 'EUR', targetDate: '2099-08-17', targetAmount: '1000' });

    await prisma.user.delete({ where: { email: `cascade${TEST_DOMAIN}` } });

    assert.equal(await prisma.goal.findUnique({ where: { id: created.body.data.goal.id } }), null);
  });
});
