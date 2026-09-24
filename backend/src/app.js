import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';
import { config as defaultConfig } from './config.js';
import { HttpError } from './lib/errors.js';
import { createHealthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { createExchangeRateRouter } from './routes/exchangeRates.js';
import { createCronRouter } from './routes/cron.js';

// App dibuat lewat fungsi (tanpa listen) supaya test bisa memakai database/prisma palsu.
// `config` boleh sebagian: bagian yang tidak diisi test memakai nilai dari config.js.
export function createApp({ db, prisma, config, corsOrigin = '*' }) {
  const appConfig = { ...defaultConfig, ...config };
  const app = express();

  app.disable('x-powered-by');
  // Di belakang reverse proxy (Azure/Railway), rate limit butuh IP asli client dari X-Forwarded-For.
  app.set('trust proxy', appConfig.trustProxy);
  // `credentials` wajib supaya browser mau mengirim cookie refresh token lintas origin.
  app.use(cors({ origin: corsOrigin === '*' ? '*' : corsOrigin.split(','), credentials: corsOrigin !== '*' }));
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/v1/health', createHealthRouter({ db }));
  app.use('/api/v1/auth', createAuthRouter({ prisma, config: appConfig }));
  app.use('/api/v1/exchange-rates', createExchangeRateRouter({ prisma }));
  app.use('/api/v1/internal/cron', createCronRouter({ prisma, config: appConfig }));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not Found' } });
  });

  // Semua error dibalas dengan bentuk yang sama: { error: { code, message, details? } }.
  // Express mengenali error handler dari 4 parameternya, jadi `_next` harus tetap ada.
  app.use((err, req, res, _next) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data yang dikirim tidak valid',
          details: err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
        },
      });
    }

    const status = err.status ?? 500;
    if (status >= 500) console.error(err);

    res.status(status).json({
      error: {
        code: err instanceof HttpError ? err.code : status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
        message: err.expose ? err.message : 'Internal Server Error',
        ...(err instanceof HttpError && err.details && { details: err.details }),
      },
    });
  });

  return app;
}
