import { Router } from 'express';

// FR-05 (API Design Overview di PRD): kurs terbaru yang sudah ditarik cron job.
export function createExchangeRateRouter({ prisma }) {
  const router = Router();

  router.get('/latest', async (req, res, next) => {
    try {
      const rates = await prisma.exchangeRate.findMany({
        orderBy: [{ targetCurrency: 'asc' }, { date: 'desc' }],
        distinct: ['baseCurrency', 'targetCurrency'],
      });

      res.json({ data: rates });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
