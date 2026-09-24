import argon2 from 'argon2';

// argon2id dengan parameter bawaan library (64 MiB, 3 iterasi) sudah memenuhi rekomendasi OWASP.
export function hashPassword(password) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}
