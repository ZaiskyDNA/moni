import cron from 'node-cron';
import { runExchangeRateFetchJob } from './services/exchangeRateJob.js';

// Background worker (FR-05): dipanggil dari server.js, bukan app.js, supaya test lewat
// createApp()+supertest tidak pernah memicu cron job sungguhan.
export function startExchangeRateCron({ prisma, config }) {
  const { cronSchedule } = config.exchangeRate;

  return cron.schedule(cronSchedule, async () => {
    try {
      const result = await runExchangeRateFetchJob({ prisma, config });
      console.log(`[cron] Kurs tersimpan: ${result.savedCount} pasangan mata uang (${result.date})`);
    } catch (err) {
      console.error('[cron] Gagal menarik data kurs', err);
    }
  });
}
