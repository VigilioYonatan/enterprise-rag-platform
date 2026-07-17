import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export function createEndpointRateLimiter(options: { windowMs: number; limit: number }): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ipKey = ipKeyGenerator(req.ip ?? '127.0.0.1');
      const auth = req.headers.authorization;
      if (typeof auth === 'string' && auth.startsWith('Bearer ') && auth.length > 16) {
        const tokenFingerprint = createHash('sha256').update(auth).digest('hex').slice(0, 20);
        return `tok:${tokenFingerprint}:${ipKey}`;
      }
      return `ip:${ipKey}`;
    },
    message: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please retry shortly.',
    },
  });
}
