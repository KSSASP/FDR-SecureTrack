import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

// 1. List Users
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await query<any>(`
      SELECT u.id, u.email, u.name, u.role, u.institution_id, u.phone, u.status, u.created_at,
             i.name as institution_name, i.code as institution_code
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      ORDER BY u.created_at DESC
    `);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// 2. Create User
router.post('/', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, institution_id, phone } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Email, password, name, and role are required' });
      return;
    }

    const existing = await queryOne(`SELECT id FROM users WHERE email = ?`, [email.trim().toLowerCase()]);
    if (existing) {
      res.status(400).json({ error: 'A user account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = `usr-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    await run(
      `INSERT INTO users (id, email, password_hash, name, role, institution_id, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [id, email.trim().toLowerCase(), passwordHash, name, role, institution_id || null, phone || null, nowIso, nowIso]
    );

    await auditFromRequest(req, {
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: id,
      institutionId: institution_id || null,
      decisionReason: `Created user ${name} with role ${role}`
    });

    res.status(201).json({ message: 'User account created successfully', userId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// 3. Toggle Status
router.put('/:id/status', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, [status, nowIso, id]);

    await auditFromRequest(req, {
      action: 'USER_STATUS_CHANGE',
      entityType: 'USER',
      entityId: id,
      decisionReason: `Changed user status to ${status}`
    });

    res.json({ message: `User status changed to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;
