import { HttpError } from '../lib/errors.js';
import { findOwnedOrThrow } from '../lib/ownership.js';

// Bentuk goal yang dikirim ke client: nominal sebagai string (presisi Decimal tetap utuh)
// dan tanggal target tanpa jam, sesuai kolom @db.Date.
function toGoalResponse(goal) {
  return {
    id: goal.id,
    destinationCountry: goal.destinationCountry ?? null,
    targetCurrency: goal.targetCurrency,
    targetDate: new Date(goal.targetDate).toISOString().slice(0, 10),
    targetAmount: goal.targetAmount.toString(),
    status: goal.status,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

// Prisma butuh Date untuk kolom tanggal; input tervalidasi berupa string YYYY-MM-DD.
function toGoalData(input) {
  const { targetDate, ...rest } = input;
  return targetDate ? { ...rest, targetDate: new Date(`${targetDate}T00:00:00Z`) } : rest;
}

// FR-02: target keberangkatan. Semua query difilter userId dari token, bukan dari body.
export function createGoalService({ prisma }) {
  const findOwned = (userId, id) => findOwnedOrThrow(prisma.goal, { id, userId, resource: 'Target' });

  return {
    async create(userId, input) {
      const goal = await prisma.goal.create({ data: { ...toGoalData(input), userId } });
      return toGoalResponse(goal);
    },

    // Tanpa filter, goal yang sudah dibatalkan disembunyikan (soft-delete); minta
    // `?status=CANCELLED` untuk melihatnya.
    async list(userId, { status }) {
      const goals = await prisma.goal.findMany({
        where: { userId, status: status ?? { not: 'CANCELLED' } },
        orderBy: [{ targetDate: 'asc' }, { createdAt: 'asc' }],
      });
      return goals.map(toGoalResponse);
    },

    async get(userId, id) {
      return toGoalResponse(await findOwned(userId, id));
    },

    async update(userId, id, input) {
      const goal = await findOwned(userId, id);

      if (goal.status === 'CANCELLED') {
        throw new HttpError(409, 'GOAL_CANCELLED', 'Target yang sudah dibatalkan tidak bisa diubah');
      }

      const updated = await prisma.goal.update({ where: { id: goal.id }, data: toGoalData(input) });
      return toGoalResponse(updated);
    },

    // Soft-delete: SavingCalculation dan Alert bergantung pada goal, jadi barisnya tidak dihapus.
    async cancel(userId, id) {
      const goal = await findOwned(userId, id);

      if (goal.status !== 'CANCELLED') {
        await prisma.goal.update({ where: { id: goal.id }, data: { status: 'CANCELLED' } });
      }
    },
  };
}
