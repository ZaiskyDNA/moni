import { HttpError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/jwt.js';

// Dipasang di depan semua endpoint milik user (selain /auth/* dan /internal/cron/*).
// Setelah lolos, `req.user = { id, email }` dipakai untuk memfilter data per user.
export function requireAuth({ config }) {
  return (req, res, next) => {
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    const user = scheme === 'Bearer' && token ? verifyAccessToken(token, config.auth) : null;

    if (!user) {
      return next(new HttpError(401, 'UNAUTHORIZED', 'Token tidak valid atau sudah kedaluwarsa'));
    }

    req.user = user;
    next();
  };
}
