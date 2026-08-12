import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {

  // Console log error for debugging
  console.error('[Error Handler Log]:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    name: err.name,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { error: err.details } : {}),
    });
  }

  // Handle Zod Schema validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // Handle Prisma Specific errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    // P2002: Unique constraint failed
    if (prismaErr.code === 'P2002') {
      const targets = prismaErr.meta?.target || [];
      return res.status(409).json({
        success: false,
        message: `Conflict: Duplicate value for unique field (${targets.join(', ')})`,
      });
    }
    // P2025: Record not found
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'The requested record could not be found or does not exist.',
      });
    }
  }

  // Fallback default error
  const statusCode = 500;
  const responseMsg = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message: responseMsg,
  });
};
