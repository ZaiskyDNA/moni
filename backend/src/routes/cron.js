import { Router } from 'express';
import { runExchangeRateFetchJob } from '../services/exchangeRateJob.js';

// FR-05 (API Design Overview di PRD): "/internal/cron/fetch-exchange-rate" — dipanggil
// scheduler (node-cron di dalam proses, atau scheduler eksternal), bukan oleh user biasa.
// Belum ada JWT (FR-01 belum diimplementasi), jadi diproteksi shared secret sementara.
export function createCronRouter({ prisma, config }) {
  const router = Router();

  router.post('/fetch-exchange-rate', async (req, res, next) => {
    const { internalCronSecret } = config.exchangeRate;

    if (internalCronSecret && req.get('x-internal-cron-secret') !== internalCronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const result = await runExchangeRateFetchJob({ prisma, config });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
