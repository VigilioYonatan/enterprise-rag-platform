import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Traceable request ID; external IDs are accepted only in a strict bounded format. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.locals.requestId = requestId;
  next();
}
