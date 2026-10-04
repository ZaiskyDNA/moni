// Config auth untuk test: secret dummy dan rate limit longgar supaya test tidak kena 429.
export const testAuthConfig = {
  jwtSecret: 'test-access-secret',
  jwtRefreshSecret: 'test-refresh-secret',
  accessTokenTtl: 900,
  refreshTokenTtl: 3600,
  rateLimit: { windowMs: 60_000, max: 100 },
};

export const healthyDb = { query: async () => ({ rows: [{ '?column?': 1 }] }) };

// Prisma palsu untuk tabel users, disimpan di memori.
export function fakeUserPrisma() {
  const users = [];

  const pick = (user, select) =>
    select ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]])) : user;

  return {
    users,
    user: {
      async create({ data, select }) {
        if (users.some((u) => u.email === data.email)) {
          throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        }
        const user = { id: `user-${users.length + 1}`, createdAt: new Date(), ...data };
        users.push(user);
        return pick(user, select);
      },
      async findUnique({ where, select }) {
        const user = users.find((u) => (where.id ? u.id === where.id : u.email === where.email));
        return user ? pick(user, select) : null;
      },
    },
  };
}

// Prisma palsu untuk tabel goals, hanya mendukung query yang dipakai goalService.
export function fakeGoalPrisma() {
  const goals = [];

  const matchesStatus = (goal, status) =>
    status === undefined || (typeof status === 'string' ? goal.status === status : goal.status !== status.not);

  return {
    goals,
    goal: {
      async create({ data }) {
        const now = new Date();
        const goal = { id: `goal-${goals.length + 1}`, destinationCountry: null, status: 'ACTIVE', createdAt: now, updatedAt: now, ...data };
        goals.push(goal);
        return { ...goal };
      },
      async findFirst({ where }) {
        const goal = goals.find((g) => g.id === where.id && g.userId === where.userId);
        return goal ? { ...goal } : null;
      },
      async findMany({ where }) {
        return goals
          .filter((g) => g.userId === where.userId && matchesStatus(g, where.status))
          .sort((a, b) => a.targetDate - b.targetDate)
          .map((g) => ({ ...g }));
      },
      async update({ where, data }) {
        const goal = goals.find((g) => g.id === where.id);
        Object.assign(goal, data, { updatedAt: new Date() });
        return { ...goal };
      },
    },
  };
}
