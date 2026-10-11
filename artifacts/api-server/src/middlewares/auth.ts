import type { RequestHandler } from 'express';
import jwt from 'jwt-simple';
import { eq } from 'drizzle-orm';
import { db, users } from '@workspace/db';
import type { Socket } from 'socket.io';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  id: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const configuredJwtSecret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;

if (!configuredJwtSecret) {
  throw new Error('JWT_SECRET or SESSION_SECRET must be configured for authentication');
}

const JWT_SECRET: string = configuredJwtSecret;

export function createAccessToken(id: number, role: string | null): string {
  return jwt.encode({ id, role }, JWT_SECRET);
}

function getBearerToken(value: string | undefined): string | null {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function resolveJwtUser(token: string): Promise<AuthenticatedUser | null> {
  let decoded: unknown;
  try {
    decoded = jwt.decode(token, JWT_SECRET);
  } catch {
    return null;
  }

  if (typeof decoded !== 'object' || decoded === null || !('id' in decoded)) {
    return null;
  }

  const id = decoded.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, id));

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    role: (user.role ?? '').trim().toUpperCase(),
  };
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = getBearerToken(req.get('authorization'));
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await resolveJwtUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.authUser = user;
    return next();
  } catch (error) {
    logger.error({ err: error }, 'Failed to resolve authenticated user');
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.authUser.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Administrator access required' });
  }

  return next();
};

export function authenticateSocketConnection(
  socket: Socket,
  next: (error?: Error) => void,
): void {
  const authToken = socket.handshake.auth?.token;
  const header = socket.handshake.headers.authorization;
  const authorization = Array.isArray(header) ? header[0] : header;
  const token = typeof authToken === 'string' ? authToken : getBearerToken(authorization);

  if (!token) {
    next(new Error('Authentication required'));
    return;
  }

  void resolveJwtUser(token)
    .then((user) => {
      if (!user) {
        next(new Error('Invalid or expired token'));
        return;
      }

      socket.data.authUser = user;
      next();
    })
    .catch((error: unknown) => {
      logger.error({ err: error, socketId: socket.id }, 'Failed to authenticate chat socket');
      next(new Error('Authentication service unavailable'));
    });
}