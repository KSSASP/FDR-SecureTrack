import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { maturityMonitoringService } from '../services/maturityMonitoringService.js';
import { auditFromRequest } from '../services/auditService.js';

const router = Router();

router.get('/summary', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await maturityMonitoringService.getMaturitySummary();

    // If Institution Admin, filter results to their institution
    if (req.user!.role === 'INSTITUTION_ADMIN') {
      const instId = req.user!.institution_id;
      res.json({
        maturing30Days: summary.maturing30Days.filter(f => f.institution_id === instId),
        maturing60Days: summary.maturing60Days.filter(f => f.institution_id === instId),
        maturing90Days: summary.maturing90Days.filter(f => f.institution_id === instId),
        alreadyMatured: summary.alreadyMatured.filter(f => f.institution_id === instId),
        overdueRenewals: summary.overdueRenewals.filter(f => f.institution_id === instId)
      });
      return;
    }

    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve maturity summary' });
  }
});

router.post('/scan', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await maturityMonitoringService.runMaturityScan();

    await auditFromRequest(req, {
      action: 'MATURITY_MONITORING_SCAN',
      entityType: 'SYSTEM_SCHEDULER',
      entityId: 'SCHED-MATURITY',
      decisionReason: `Executed on-demand maturity scan: ${result.alertsGenerated} alerts dispatched, ${result.casesEscalated} overdue escalations triggered`
    });

    res.json({
      message: 'Maturity monitoring scan executed successfully',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute maturity scan' });
  }
});

export default router;
