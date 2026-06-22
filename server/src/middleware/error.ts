import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './auth.js';
import { captureError } from '../lib/logger.js';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS: origin not allowed' });
  }
  // Unexpected (500-class): report to the observability seam with request
  // context, but never leak internals to the client.
  const requestId = (req as { id?: string }).id;
  void captureError(err, { requestId, method: req.method, path: req.path });
  res.status(500).json({ error: 'Internal server error', requestId });
}
