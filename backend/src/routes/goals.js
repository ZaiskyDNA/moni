import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { createGoalService } from '../services/goalService.js';
import { createGoalSchema, listGoalsQuerySchema, updateGoalSchema } from '../validators/goals.js';

// FR-02: kelola target keberangkatan. Semua endpoint butuh login, dan goal milik user
// lain dibalas 404 (lihat src/lib/ownership.js).
export function createGoalRouter({ prisma, config }) {
  const router = Router();
  const goalService = createGoalService({ prisma });

  router.use(requireAuth({ config }));

  router.post('/', async (req, res) => {
    const goal = await goalService.create(req.user.id, createGoalSchema.parse(req.body));
    res.status(201).json({ data: { goal } });
  });

  router.get('/', async (req, res) => {
    const goals = await goalService.list(req.user.id, listGoalsQuerySchema.parse(req.query));
    res.json({ data: { goals } });
  });

  router.get('/:id', async (req, res) => {
    const goal = await goalService.get(req.user.id, req.params.id);
    res.json({ data: { goal } });
  });

  router.put('/:id', async (req, res) => {
    const goal = await goalService.update(req.user.id, req.params.id, updateGoalSchema.parse(req.body));
    res.json({ data: { goal } });
  });

  router.delete('/:id', async (req, res) => {
    await goalService.cancel(req.user.id, req.params.id);
    res.status(204).end();
  });

  return router;
}
