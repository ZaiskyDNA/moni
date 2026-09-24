import { HttpError } from './errors.js';

// Ambil resource milik user yang sedang login (model Prisma yang punya kolom `userId`,
// mis. prisma.goal / prisma.transaction), atau lempar 404. Sengaja 404, bukan 403, supaya
// user lain tidak bisa menebak id mana yang ada.
export async function findOwnedOrThrow(model, { id, userId, resource = 'Data' }) {
  const record = await model.findFirst({ where: { id, userId } });

  if (!record) {
    throw new HttpError(404, 'NOT_FOUND', `${resource} tidak ditemukan`);
  }

  return record;
}
