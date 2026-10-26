import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. Get Risk Breakdown for FDR
router.get('/fdr/:fdrId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;

    const fdr = await queryOne<any>(`SELECT institution_id FROM fdr_instruments WHERE id = ?`, [fdrId]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== fdr.institution_id) {
      res.status(403).json({ error: 'Unauthorized to view risk analysis' });
      return;
    }

    const assessment = await queryOne<any>(
      `SELECT ra.*, u.name as overridden_by_name
       FROM risk_assessments ra
       LEFT JOIN users u ON ra.overridden_by = u.id
       WHERE ra.fdr_id = ?`,
      [fdrId]
    );

    if (!assessment) {
      // Calculate fresh score if none exists
      const calculated = await riskScoringService.calculateRisk(fdrId);
      res.json({ assessment: calculated });
      return;
    }

    let parsedFactors = [];
    try {
      parsedFactors = JSON.parse(assessment.factors);
    } catch (_) {}

    res.json({
      assessment: {
        ...assessment,
        factors: parsedFactors
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve risk score' });
  }
});

// 2. Recalculate Risk Score
router.post('/recalculate/:fdrId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const result = await riskScoringService.calculateRisk(fdrId);
    res.json({ message: 'Risk score recalculated successfully', result });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to recalculate risk score' });
  }
});

// 3. Officer Override of Risk Score with Recorded Reason
router.post('/override/:fdrId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const { total_score, override_reason } = req.body;

    if (total_score === undefined || !override_reason || override_reason.trim().length < 5) {
      res.status(400).json({ error: 'Manual risk score and a clear explanatory reason are mandatory' });
      return;
    }

    const scoreNum = Math.min(100, Math.max(0, parseInt(total_score, 10)));
    let riskLevel = 'LOW';
    if (scoreNum >= 80) riskLevel = 'CRITICAL';
    else if (scoreNum >= 60) riskLevel = 'HIGH';
    else if (scoreNum >= 30) riskLevel = 'MEDIUM';

    const nowIso = new Date().toISOString();

    await run(
      `UPDATE risk_assessments
       SET total_score = ?, risk_level = ?, overridden_by = ?, override_reason = ?, calculated_at = ?
       WHERE fdr_id = ?`,
      [scoreNum, riskLevel, req.user!.id, override_reason, nowIso, fdrId]
    );

    await run(
      `UPDATE fdr_instruments SET risk_score = ?, risk_level = ?, updated_at = ? WHERE id = ?`,
      [scoreNum, riskLevel, nowIso, fdrId]
    );

    await auditFromRequest(req, {
      action: 'RISK_SCORE_OVERRIDE',
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: null,
      decisionReason: `Officer manual override to score ${scoreNum} (${riskLevel}): ${override_reason}`
    });

    res.json({ message: `Risk score manually adjusted to ${scoreNum} (${riskLevel}) with recorded justification` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to override risk score' });
  }
});

// 4. View Configurable Risk Weights
router.get('/weights', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<any>(`SELECT * FROM system_configs WHERE key LIKE 'RISK_WEIGHT_%'`);
    res.json({ weights: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve risk weights' });
  }
});

// 5. Update Risk Weights (Super Admin only)
router.put('/weights', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { weights } = req.body as { weights: Record<string, number> };
    if (!weights) {
      res.status(400).json({ error: 'Weights dictionary required' });
      return;
    }

    const nowIso = new Date().toISOString();
    for (const [key, val] of Object.entries(weights)) {
      if (key.startsWith('RISK_WEIGHT_')) {
        await run(
          `UPDATE system_configs SET value = ?, updated_at = ?, updated_by = ? WHERE key = ?`,
          [val.toString(), nowIso, req.user!.name, key]
        );
      }
    }

    await auditFromRequest(req, {
      action: 'UPDATE_RISK_WEIGHTS',
      entityType: 'SYSTEM_CONFIG',
      entityId: 'RISK_RULES',
      decisionReason: 'Super Admin updated risk scoring factor weights'
    });

    res.json({ message: 'Risk scoring model weights updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update risk weights' });
  }
});

export default router;
