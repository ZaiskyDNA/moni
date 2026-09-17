import pg from 'pg';

export function createDb(databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL belum diset. Buat file .env di root project (lihat README).');
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    // Tanpa batas waktu, endpoint readiness bisa menggantung saat database mati.
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    console.error('Error tak terduga pada koneksi PostgreSQL', err);
  });

  return pool;
}
