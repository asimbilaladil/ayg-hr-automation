import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate entry',
        field: (err.meta?.target as string[])?.join(', '),
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  if (err instanceof Error) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  return res.status(500).json({ error: 'Internal server error' });
}
