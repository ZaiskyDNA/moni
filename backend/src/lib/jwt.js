import jwt from 'jsonwebtoken';

// Access token dan refresh token memakai secret berbeda + klaim `type`, supaya refresh
// token tidak bisa dipakai sebagai access token (dan sebaliknya).
function sign(user, type, secret, ttlSeconds) {
  return jwt.sign({ email: user.email, type }, secret, {
    subject: user.id,
    expiresIn: ttlSeconds,
    algorithm: 'HS256',
  });
}

// Mengembalikan `{ id, email }`, atau null kalau token rusak, kedaluwarsa, atau salah jenis.
function verify(token, type, secret) {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return payload.type === type ? { id: payload.sub, email: payload.email } : null;
  } catch {
    return null;
  }
}

export function signAccessToken(user, auth) {
  return sign(user, 'access', auth.jwtSecret, auth.accessTokenTtl);
}

export function signRefreshToken(user, auth) {
  return sign(user, 'refresh', auth.jwtRefreshSecret, auth.refreshTokenTtl);
}

export function verifyAccessToken(token, auth) {
  return verify(token, 'access', auth.jwtSecret);
}

export function verifyRefreshToken(token, auth) {
  return verify(token, 'refresh', auth.jwtRefreshSecret);
}
