import { PrismaClient } from '@prisma/client';

// Singleton: modul di-cache oleh Node, jadi import ini di banyak tempat tetap
// memakai satu connection pool yang sama (Prisma mengelola pool-nya sendiri).
export const prisma = new PrismaClient();
