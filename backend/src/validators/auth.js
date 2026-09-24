import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid'));

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email,
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(128, 'Password maksimal 128 karakter')
    .regex(/[A-Za-z]/, 'Password harus mengandung huruf')
    .regex(/\d/, 'Password harus mengandung angka'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password wajib diisi'),
});
