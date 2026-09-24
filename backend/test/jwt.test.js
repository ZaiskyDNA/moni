import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/lib/jwt.js';
import { testAuthConfig } from './helpers.js';

const user = { id: 'user-1', email: 'budi@contoh.com' };

test('access token bisa diverifikasi dan berisi id + email user', () => {
  const token = signAccessToken(user, testAuthConfig);

  assert.deepEqual(verifyAccessToken(token, testAuthConfig), user);
});

test('refresh token tidak bisa dipakai sebagai access token, dan sebaliknya', () => {
  assert.equal(verifyAccessToken(signRefreshToken(user, testAuthConfig), testAuthConfig), null);
  assert.equal(verifyRefreshToken(signAccessToken(user, testAuthConfig), testAuthConfig), null);
});

test('token dengan secret lain atau sudah kedaluwarsa ditolak', () => {
  const otherSecret = signAccessToken(user, { ...testAuthConfig, jwtSecret: 'secret-lain' });
  const expired = signAccessToken(user, { ...testAuthConfig, accessTokenTtl: -1 });

  assert.equal(verifyAccessToken(otherSecret, testAuthConfig), null);
  assert.equal(verifyAccessToken(expired, testAuthConfig), null);
  assert.equal(verifyAccessToken('bukan-token', testAuthConfig), null);
});
