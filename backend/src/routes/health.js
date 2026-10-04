import { Router } from 'express';

export function createHealthRouter({ db, commitSha }) {
  const router = Router();

  // Liveness: apakah proses masih hidup? Sengaja tidak menyentuh database,
  // supaya container tidak di-restart hanya karena database sedang lambat.
  // `commit` dipakai workflow deploy untuk memastikan versi baru yang sedang live.
  router.get('/', (req, res) => {
    res.json({
      status: 'ok',
      commit: commitSha ?? null,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness: apakah siap melayani request? Butuh database yang bisa dihubungi.
  router.get('/ready', async (req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ status: 'ready', database: 'up' });
    } catch {
      res.status(503).json({ status: 'not_ready', database: 'down' });
    }
  });

  return router;
}
