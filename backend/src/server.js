import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db.js';
import { prisma } from './prisma.js';
import { startExchangeRateCron } from './cron.js';

if (!config.auth.jwtSecret || !config.auth.jwtRefreshSecret) {
  throw new Error('JWT_SECRET / JWT_REFRESH_SECRET belum diset. Tambahkan ke file .env (lihat .env.example).');
}

const db = createDb(config.databaseUrl);
const app = createApp({ db, prisma, config, corsOrigin: config.corsOrigin });

const server = app.listen(config.port, () => {
  console.log(`Backend berjalan di port ${config.port} (${config.env})`);
});

const exchangeRateCron = startExchangeRateCron({ prisma, config });

// Docker/Azure mengirim SIGTERM saat container dihentikan: selesaikan request yang
// sedang jalan dan tutup koneksi database sebelum keluar.
function shutdown(signal) {
  console.log(`${signal} diterima, menutup server...`);
  exchangeRateCron.stop();
  server.close(async () => {
    await Promise.all([db.end(), prisma.$disconnect()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
