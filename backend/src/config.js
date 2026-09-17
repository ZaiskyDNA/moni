// Semua konfigurasi dibaca dari environment variable, sehingga nilai lokal, CI,
// dan Azure cukup dibedakan lewat .env / App Settings tanpa mengubah kode.
export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  // Pisahkan beberapa origin dengan koma, misalnya: https://app.contoh.com,http://localhost:5173
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
