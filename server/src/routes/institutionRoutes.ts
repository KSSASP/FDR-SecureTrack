import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    let sql = `SELECT * FROM institutions`;
    const params: any[] = [];

    // If Institution Admin, only return their institution
    if (req.user!.role === 'INSTITUTION_ADMIN') {
      sql += ` WHERE id = ?`;
      params.push(req.user!.institution_id);
    } else {
      sql += ` ORDER BY name ASC`;
    }

    const institutions = await query(sql, params);
    res.json({ institutions });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve institutions' });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== id) {
      res.status(403).json({ error: 'Access denied: Cannot access other institution details' });
      return;
    }

    const institution = await queryOne<any>(
      `SELECT * FROM institutions WHERE id = ?`,
      [id]
    );

    if (!institution) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    const fdrs = await query(
      `SELECT * FROM fdr_instruments WHERE institution_id = ? AND is_archived = 0 ORDER BY maturity_date ASC`,
      [id]
    );

    res.json({ institution, fdrs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve institution details' });
  }
});

router.put('/:id', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, contact_email, contact_phone, status, address, city, state } = req.body;

    const existing = await queryOne(`SELECT * FROM institutions WHERE id = ?`, [id]);
    if (!existing) {
      res.status(404).json({ error: 'Institution not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE institutions
       SET name = COALESCE(?, name),
           contact_email = COALESCE(?, contact_email),
           contact_phone = COALESCE(?, contact_phone),
           status = COALESCE(?, status),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           state = COALESCE(?, state),
           updated_at = ?
       WHERE id = ?`,
      [name, contact_email, contact_phone, status, address, city, state, nowIso, id]
    );

    await auditFromRequest(req, {
      action: 'UPDATE_INSTITUTION',
      entityType: 'INSTITUTION',
      entityId: id,
      institutionId: id,
      beforeState: existing,
      afterState: req.body,
      decisionReason: 'Updated institution administrative metadata'
    });

    res.json({ message: 'Institution profile updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update institution' });
  }
});

export default router;
