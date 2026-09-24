import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, verifyPassword } from '../src/lib/password.js';

test('hash memakai argon2id dan tidak menyimpan password asli', async () => {
  const hash = await hashPassword('rahasia123');

  assert.match(hash, /^\$argon2id\$/);
  assert.ok(!hash.includes('rahasia123'));
});

test('verifikasi berhasil untuk password benar dan gagal untuk password salah', async () => {
  const hash = await hashPassword('rahasia123');

  assert.equal(await verifyPassword(hash, 'rahasia123'), true);
  assert.equal(await verifyPassword(hash, 'rahasia124'), false);
});
