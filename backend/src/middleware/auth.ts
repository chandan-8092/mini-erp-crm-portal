import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { Role } from '@prisma/client';

interface TokenPayload {
  id: string;
  email: string;
  role: Role;
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-this-in-production';
    let decoded: TokenPayload;

    try {
      decoded = jwt.verify(token, secret) as TokenPayload;
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User associated with token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(`Access denied. Roles allowed: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

