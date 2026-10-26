import { Router, Request, Response } from 'express';
import { query } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// 1. Query System Audit Logs
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, action, limit = '50' } = req.query as Record<string, string>;
    const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10)));

    let whereClauses: string[] = [];
    const params: any[] = [];

    // Isolation check
    if (req.user!.role === 'INSTITUTION_ADMIN') {
      whereClauses.push('institution_id = ?');
      params.push(req.user!.institution_id);
    }

    if (entityType) {
      whereClauses.push('entity_type = ?');
      params.push(entityType);
    }

    if (action) {
      whereClauses.push('action = ?');
      params.push(action);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const logs = await query<any>(
      `SELECT * FROM audit_events
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limitNum}`,
      params
    );

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve audit trail' });
  }
});

// 2. Query Entity Audit Timeline
router.get('/fdr/:fdrId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const logs = await query<any>(
      `SELECT * FROM audit_events
       WHERE (entity_type = 'FDR_INSTRUMENT' AND entity_id = ?)
          OR (entity_type = 'DOCUMENT' AND entity_id IN (SELECT id FROM documents WHERE fdr_id = ?))
          OR (entity_type = 'RENEWAL_REQUEST' AND entity_id IN (SELECT id FROM renewal_requests WHERE original_fdr_id = ?))
          OR (entity_type = 'RELEASE_REQUEST' AND entity_id IN (SELECT id FROM release_requests WHERE fdr_id = ?))
       ORDER BY created_at DESC`,
      [fdrId, fdrId, fdrId, fdrId]
    );

    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve FDR timeline' });
  }
});

export default router;
