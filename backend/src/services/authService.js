import { HttpError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

// Kolom user yang aman dikirim ke client (tanpa passwordHash).
const publicUser = { id: true, name: true, email: true, createdAt: true };

// Hash acak untuk login dengan email yang tidak terdaftar: verifikasi tetap dijalankan
// supaya waktu respons tidak membocorkan email mana yang sudah terdaftar.
let dummyHash;
function getDummyHash() {
  dummyHash ??= hashPassword('email-tidak-terdaftar-1');
  return dummyHash;
}

export function createAuthService({ prisma }) {
  return {
    async register({ name, email, password }) {
      const passwordHash = await hashPassword(password);

      try {
        return await prisma.user.create({ data: { name, email, passwordHash }, select: publicUser });
      } catch (err) {
        // P2002 = unique constraint. Cek di sini, bukan findUnique sebelum create, supaya
        // dua registrasi bersamaan dengan email sama tetap tertangkap.
        if (err?.code === 'P2002') {
          throw new HttpError(409, 'EMAIL_TAKEN', 'Email sudah terdaftar');
        }
        throw err;
      }
    },

    async authenticate({ email, password }) {
      const user = await prisma.user.findUnique({ where: { email } });
      const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);

      if (!user || !valid) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email atau password salah');
      }

      return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
    },

    findById(id) {
      return prisma.user.findUnique({ where: { id }, select: publicUser });
    },
  };
}
