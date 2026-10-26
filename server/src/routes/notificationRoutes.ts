import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let sql = `SELECT * FROM notifications`;
    const params: any[] = [];

    if (user.role === 'INSTITUTION_ADMIN') {
      sql += ` WHERE institution_id = ?`;
      params.push(user.institution_id);
    } else if (user.role === 'REGULATION_OFFICER') {
      sql += ` WHERE target_role IN ('REGULATION_OFFICER', 'ALL') OR target_user_id = ?`;
      params.push(user.id);
    } else if (user.role === 'SUPER_ADMIN') {
      sql += ` WHERE target_role IN ('SUPER_ADMIN', 'ALL') OR is_escalated = 1`;
    }

    sql += ` ORDER BY is_read ASC, created_at DESC LIMIT 50`;
    const notifications = await query<any>(sql, params);

    const unreadCount = notifications.filter(n => n.is_read === 0).length;

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

router.post('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

router.post('/mark-all-read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    if (user.role === 'INSTITUTION_ADMIN') {
      await run(`UPDATE notifications SET is_read = 1 WHERE institution_id = ?`, [user.institution_id]);
    } else {
      await run(`UPDATE notifications SET is_read = 1 WHERE target_role = ? OR target_user_id = ?`, [user.role, user.id]);
    }
    res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

export default router;
