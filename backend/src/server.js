import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db.js';
import { prisma } from './prisma.js';

const db = createDb(config.databaseUrl);
const app = createApp({ db, corsOrigin: config.corsOrigin });

const server = app.listen(config.port, () => {
  console.log(`Backend berjalan di port ${config.port} (${config.env})`);
});

// Docker/Azure mengirim SIGTERM saat container dihentikan: selesaikan request yang
// sedang jalan dan tutup koneksi database sebelum keluar.
function shutdown(signal) {
  console.log(`${signal} diterima, menutup server...`);
  server.close(async () => {
    await Promise.all([db.end(), prisma.$disconnect()]);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
