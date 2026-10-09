import { z } from 'zod';

// Query param datang sebagai string, jadi field angka wajib pakai z.coerce.
// Batasan horizon/window disamakan dengan ml-service/app/schemas.py supaya pesan error
// konsisten dan request yang pasti ditolak ml-service sudah ditolak lebih dulu di sini.
export const forecastQuerySchema = z.object({
  target: z
    .string()
    .trim()
    .min(1, 'target wajib diisi (contoh: AUD)')
    .transform((value) => value.toUpperCase()),
  horizon: z.coerce.number().int().min(1).max(30).default(7),
  model: z.enum(['linear_regression', 'moving_average']).default('linear_regression'),
  window: z.coerce.number().int().min(2).max(60).default(7),
});
