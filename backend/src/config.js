// Semua konfigurasi dibaca dari environment variable, sehingga nilai lokal, CI,
// dan Azure cukup dibedakan lewat .env / App Settings tanpa mengubah kode.
export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL,
  // Pisahkan beberapa origin dengan koma, misalnya: https://app.contoh.com,http://localhost:5173
  corsOrigin: process.env.CORS_ORIGIN ?? '*',

  exchangeRate: {
    // Pakai `||` (bukan `??`) di seluruh field ini: docker-compose meneruskan variabel
    // yang tidak diset di .env sebagai string kosong, bukan `undefined`, jadi `??` tidak
    // akan jatuh ke default.
    // Frankfurter tidak butuh API key (lihat docs/Exchange_Rate_API_Comparison.md).
    apiBaseUrl: process.env.EXCHANGE_RATE_API_BASE_URL || 'https://api.frankfurter.dev/v1',
    baseCurrency: process.env.EXCHANGE_RATE_BASE_CURRENCY || 'IDR',
    // Mata uang tujuan yang dipantau. Sementara statis lewat env var karena FR-02
    // (Kelola Target Keberangkatan) belum ada; ke depannya bisa diturunkan dari
    // GOAL.targetCurrency yang sedang aktif.
    trackedCurrencies: (process.env.EXCHANGE_RATE_TRACKED_CURRENCIES || 'USD,AUD,EUR,GBP,JPY,SGD')
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean),
    // Format cron standar 5 kolom. Default: setiap hari pukul 23:59 (lihat ML_Architecture.md 3.1).
    cronSchedule: process.env.EXCHANGE_RATE_CRON_SCHEDULE || '59 23 * * *',
    source: 'frankfurter',
    // Header rahasia untuk endpoint internal /internal/cron/*, karena FR-01 (JWT) belum ada.
    // String kosong dianggap "tidak diset" supaya endpoint tidak diam-diam terkunci oleh
    // variabel docker-compose yang kosong.
    internalCronSecret: process.env.INTERNAL_CRON_SECRET || undefined,
  },
};
