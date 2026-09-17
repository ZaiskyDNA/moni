import cors from 'cors';
import express from 'express';
import { createHealthRouter } from './routes/health.js';

// App dibuat lewat fungsi (tanpa listen) supaya test bisa memakai database palsu.
export function createApp({ db, corsOrigin = '*' }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: corsOrigin === '*' ? '*' : corsOrigin.split(',') }));
  app.use(express.json());

  app.use('/api/v1/health', createHealthRouter({ db }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Express mengenali error handler dari 4 parameternya, jadi `_next` harus tetap ada.
  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ error: err.expose ? err.message : 'Internal Server Error' });
  });

  return app;
}
