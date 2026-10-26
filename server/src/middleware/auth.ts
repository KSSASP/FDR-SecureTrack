import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { queryOne } from '../db/database.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'REGULATION_OFFICER' | 'INSTITUTION_ADMIN';
  institution_id: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)
    || (req.headers['x-access-token'] as string | undefined)
    || (req.query.token as string | undefined);

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { id: string; email: string };
    const user = await queryOne<AuthenticatedUser>(
      'SELECT id, email, name, role, institution_id FROM users WHERE id = ? AND status = ?',
      [payload.id, 'ACTIVE']
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid or inactive user account' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication session' });
  }
}
