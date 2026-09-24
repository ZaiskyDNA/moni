import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { HttpError } from '../lib/errors.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createAuthService } from '../services/authService.js';
import { loginSchema, registerSchema } from '../validators/auth.js';

const REFRESH_COOKIE = 'refreshToken';

// FR-01: registrasi, login, dan sesi (access token di body, refresh token di cookie httpOnly).
export function createAuthRouter({ prisma, config }) {
  const router = Router();
  const authService = createAuthService({ prisma });

  // Batas percobaan per IP untuk mencegah brute-force (PRD bagian Keamanan). Satu limiter
  // per endpoint, supaya register dan login tidak saling menghabiskan kuota.
  const limiter = () =>
    rateLimit({
      windowMs: config.auth.rateLimit.windowMs,
      limit: config.auth.rateLimit.max,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (req, res, next) =>
        next(new HttpError(429, 'TOO_MANY_REQUESTS', 'Terlalu banyak percobaan, coba lagi nanti')),
    });

  const cookieOptions = {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  };

  // Refresh token baru diterbitkan setiap login/refresh (rotasi), access token dikirim di body.
  function sendSession(res, user) {
    res.cookie(REFRESH_COOKIE, signRefreshToken(user, config.auth), {
      ...cookieOptions,
      maxAge: config.auth.refreshTokenTtl * 1000,
    });
    res.json({
      data: {
        user,
        accessToken: signAccessToken(user, config.auth),
        tokenType: 'Bearer',
        expiresIn: config.auth.accessTokenTtl,
      },
    });
  }

  router.post('/register', limiter(), async (req, res) => {
    const input = registerSchema.parse(req.body);
    const user = await authService.register(input);
    res.status(201).json({ data: { user } });
  });

  router.post('/login', limiter(), async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await authService.authenticate(input);
    sendSession(res, user);
  });

  router.post('/refresh', async (req, res) => {
    const session = verifyRefreshToken(req.cookies?.[REFRESH_COOKIE] ?? '', config.auth);
    // User bisa saja sudah dihapus sejak refresh token diterbitkan.
    const user = session && (await authService.findById(session.id));

    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Sesi tidak valid, silakan login ulang');
    }

    sendSession(res, user);
  });

  router.post('/logout', (req, res) => {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth({ config }), async (req, res) => {
    const user = await authService.findById(req.user.id);

    if (!user) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Sesi tidak valid, silakan login ulang');
    }

    res.json({ data: { user } });
  });

  return router;
}
