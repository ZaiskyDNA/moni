import { Router } from 'express';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requestForecast } from '../services/forecastClient.js';
import { forecastQuerySchema } from '../validators/exchangeRates.js';

// FR-05 (API Design Overview di PRD): kurs terbaru yang sudah ditarik cron job.
export function createExchangeRateRouter({ prisma, config }) {
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

  // FR-06 (API Design Overview di PRD): proxy ke ml-service -- backend narik histori dari
  // tabel EXCHANGE_RATE, ml-service yang menghitung prediksinya (lihat ml-service/README.md).
  router.get('/forecast', requireAuth({ config }), async (req, res) => {
    const { target, horizon, model, window } = forecastQuerySchema.parse(req.query);
    const { baseCurrency, trackedCurrencies } = config.exchangeRate;

    if (!trackedCurrencies.includes(target)) {
      throw new HttpError(400, 'UNKNOWN_CURRENCY', `Mata uang "${target}" tidak dipantau sistem`, {
        trackedCurrencies,
      });
    }

    const history = await prisma.exchangeRate.findMany({
      where: { baseCurrency, targetCurrency: target },
      orderBy: { date: 'desc' },
      take: config.forecast.historyDays,
    });

    const series = history
      .reverse()
      .map((row) => ({ date: row.date.toISOString().slice(0, 10), rate: row.rate.toNumber() }));

    const forecast = await requestForecast({ serviceUrl: config.forecast.serviceUrl, series, horizon, model, window });

    res.json({ data: forecast });
  });

  return router;
}
