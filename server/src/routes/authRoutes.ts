import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, run } from '../db/database.js';
import { config } from '../config/env.js';
import { authenticateToken } from '../middleware/auth.js';
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await queryOne<any>(
      `SELECT u.*, i.name as institution_name, i.code as institution_code
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or credentials' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Account has been deactivated. Please contact administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    await auditFromRequest(req, {
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      institutionId: user.institution_id,
      decisionReason: 'Successful authentication'
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institution_id: user.institution_id,
        institution_name: user.institution_name,
        institution_code: user.institution_code,
        phone: user.phone
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal authentication server error' });
  }
});

router.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await queryOne<any>(
      `SELECT u.id, u.email, u.name, u.role, u.institution_id, u.phone,
              i.name as institution_name, i.code as institution_code
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       WHERE u.id = ?`,
      [req.user!.id]
    );

    if (!user) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;
