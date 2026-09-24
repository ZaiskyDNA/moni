import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HttpError } from '../src/lib/errors.js';
import { findOwnedOrThrow } from '../src/lib/ownership.js';

const goals = [{ id: 'goal-1', userId: 'user-a' }];
const fakeGoalModel = {
  findFirst: async ({ where }) => goals.find((g) => g.id === where.id && g.userId === where.userId) ?? null,
};

test('mengembalikan resource milik user sendiri', async () => {
  const goal = await findOwnedOrThrow(fakeGoalModel, { id: 'goal-1', userId: 'user-a' });

  assert.equal(goal.id, 'goal-1');
});

test('resource milik user lain dianggap tidak ada (404)', async () => {
  await assert.rejects(
    findOwnedOrThrow(fakeGoalModel, { id: 'goal-1', userId: 'user-b', resource: 'Target' }),
    (err) => err instanceof HttpError && err.status === 404 && err.message === 'Target tidak ditemukan',
  );
});
