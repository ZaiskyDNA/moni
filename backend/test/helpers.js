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
