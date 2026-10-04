import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../lib/currencies.js';

export const GOAL_STATUSES = ['ACTIVE', 'ACHIEVED', 'CANCELLED'];

// Tanggal hari ini (YYYY-MM-DD) menurut WIB, karena pengguna MONI berada di Indonesia
// dan server cloud biasanya berjalan di UTC.
export function todayInJakarta(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
}

// Nominal uang dikirim sebagai string (disarankan) atau number, lalu disimpan sebagai string
// supaya Prisma menyimpannya ke kolom Decimal(14, 2) tanpa melewati aritmatika float.
const amount = z
  .union([z.string().trim(), z.number()], { error: 'Nominal target wajib diisi' })
  .transform(String)
  .pipe(
    z
      .string()
      // `abort` supaya nominal yang formatnya salah tidak ikut dicek "> 0" (pesan dobel).
      .regex(/^\d{1,12}(\.\d{1,2})?$/, {
        error: 'Nominal target harus angka positif dengan maksimal 2 angka desimal',
        abort: true,
      })
      .refine((value) => Number(value) > 0, 'Nominal target harus lebih dari 0'),
  );

const goalFields = {
  destinationCountry: z.string().trim().min(1).max(100, 'Negara tujuan maksimal 100 karakter').nullable().optional(),
  targetCurrency: z
    .string({ error: 'Mata uang target wajib diisi' })
    .trim()
    .toUpperCase()
    .pipe(z.enum(SUPPORTED_CURRENCIES, { error: `Mata uang harus salah satu dari: ${SUPPORTED_CURRENCIES.join(', ')}` })),
  targetDate: z
    .iso.date({ error: 'Tanggal target harus berformat YYYY-MM-DD' })
    .refine((date) => date > todayInJakarta(), 'Tanggal target harus di masa depan'),
  targetAmount: amount,
};

export const createGoalSchema = z.object(goalFields);

// PUT bersifat parsial: cukup kirim field yang berubah. `status` sengaja tidak bisa diubah
// di sini; pembatalan lewat DELETE dan ACHIEVED nanti ditentukan engine kalkulasi (FR-07).
export const updateGoalSchema = z
  .object(goalFields)
  .partial()
  .refine((input) => Object.keys(input).length > 0, 'Kirim minimal satu field yang ingin diubah');

export const listGoalsQuerySchema = z.object({
  status: z.string().trim().toUpperCase().pipe(z.enum(GOAL_STATUSES)).optional(),
});
