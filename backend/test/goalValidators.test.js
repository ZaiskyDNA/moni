import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createGoalSchema, listGoalsQuerySchema, todayInJakarta, updateGoalSchema } from '../src/validators/goals.js';

const validGoal = { targetCurrency: 'AUD', targetDate: '2099-01-31', targetAmount: '25000.50' };

const fieldErrors = (result) => result.error.issues.map((issue) => issue.path.join('.'));

describe('createGoalSchema', () => {
  test('menerima goal valid dan menormalkan mata uang ke huruf besar', () => {
    const goal = createGoalSchema.parse({ ...validGoal, targetCurrency: ' aud ', destinationCountry: ' Australia ' });

    assert.equal(goal.targetCurrency, 'AUD');
    assert.equal(goal.destinationCountry, 'Australia');
  });

  test('destinationCountry opsional', () => {
    assert.equal(createGoalSchema.safeParse(validGoal).success, true);
  });

  test('menolak mata uang di luar whitelist', () => {
    const result = createGoalSchema.safeParse({ ...validGoal, targetCurrency: 'XYZ' });

    assert.deepEqual(fieldErrors(result), ['targetCurrency']);
  });

  test('menolak tanggal hari ini dan masa lalu', () => {
    for (const targetDate of [todayInJakarta(), '2020-01-01']) {
      assert.equal(createGoalSchema.safeParse({ ...validGoal, targetDate }).success, false, targetDate);
    }
  });

  test('menolak tanggal yang tidak ada atau formatnya salah', () => {
    for (const targetDate of ['2099-02-30', '31/01/2099', '2099-01-31T00:00:00Z']) {
      assert.equal(createGoalSchema.safeParse({ ...validGoal, targetDate }).success, false, targetDate);
    }
  });

  test('nominal disimpan sebagai string, number juga diterima', () => {
    assert.equal(createGoalSchema.parse(validGoal).targetAmount, '25000.50');
    assert.equal(createGoalSchema.parse({ ...validGoal, targetAmount: 15000 }).targetAmount, '15000');
  });

  test('menolak nominal nol, negatif, lebih dari 2 desimal, atau melebihi Decimal(14,2)', () => {
    for (const targetAmount of ['0', 0, '-100', '10.123', '1e5', '1234567890123', 'abc', null]) {
      const result = createGoalSchema.safeParse({ ...validGoal, targetAmount });
      assert.deepEqual(fieldErrors(result), ['targetAmount'], String(targetAmount));
    }
  });

  test('field selain skema (mis. userId, status) dibuang', () => {
    const goal = createGoalSchema.parse({ ...validGoal, userId: 'user-lain', status: 'ACHIEVED' });

    assert.equal(goal.userId, undefined);
    assert.equal(goal.status, undefined);
  });
});

describe('updateGoalSchema', () => {
  test('boleh mengirim sebagian field', () => {
    assert.deepEqual(updateGoalSchema.parse({ targetAmount: '30000' }), { targetAmount: '30000' });
  });

  test('menolak body kosong', () => {
    assert.equal(updateGoalSchema.safeParse({}).success, false);
  });

  test('destinationCountry boleh dikosongkan dengan null', () => {
    assert.deepEqual(updateGoalSchema.parse({ destinationCountry: null }), { destinationCountry: null });
  });
});

describe('listGoalsQuerySchema', () => {
  test('status case-insensitive dan harus status yang dikenal', () => {
    assert.equal(listGoalsQuerySchema.parse({ status: 'active' }).status, 'ACTIVE');
    assert.equal(listGoalsQuerySchema.safeParse({ status: 'DONE' }).success, false);
  });
});

test('todayInJakarta memakai zona WIB, bukan UTC', () => {
  // 1 Jan 2027 20:00 UTC = 2 Jan 2027 03:00 WIB
  assert.equal(todayInJakarta(new Date('2027-01-01T20:00:00Z')), '2027-01-02');
});
