import { Router, Request, Response } from 'express';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { duplicateDetectionService } from '../services/duplicateDetectionService.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. List Cross-Institution Duplicate Findings (Restricted to Officers and Admins)
router.get('/', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'ALL' } = req.query as { status?: string };

    let whereClause = '';
    const params: any[] = [];
    if (status && status !== 'ALL') {
      whereClause = 'WHERE df.status = ?';
      params.push(status);
    }

    const duplicates = await query<any>(
      `SELECT df.*,
              f.fdr_number, f.bank_name, f.amount, f.maturity_date,
              i.name as institution_name, i.code as institution_code,
              f_match.fdr_number as matched_fdr_number, f_match.bank_name as matched_bank_name,
              f_match.amount as matched_amount, f_match.maturity_date as matched_maturity_date,
              i_match.name as matched_institution_name, i_match.code as matched_institution_code,
              u.name as reviewed_by_name
       FROM duplicate_findings df
       JOIN fdr_instruments f ON df.fdr_id = f.id
       JOIN institutions i ON df.institution_id = i.id
       JOIN fdr_instruments f_match ON df.matched_fdr_id = f_match.id
       JOIN institutions i_match ON df.matched_institution_id = i_match.id
       LEFT JOIN users u ON df.reviewed_by = u.id
       ${whereClause}
       ORDER BY df.similarity_score DESC, df.created_at DESC`,
      params
    );

    res.json({ duplicates });
  } catch (err: any) {
    console.error('List duplicates error:', err);
    res.status(500).json({ error: 'Failed to retrieve duplicate detection findings' });
  }
});

// 2. Trigger On-Demand Duplicate Scan for an FDR
router.post('/scan/:fdrId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const results = await duplicateDetectionService.scanFdr(fdrId);
    await riskScoringService.calculateRisk(fdrId);

    res.json({
      message: `Scanned repository against FDR. Identified ${results.length} correlation finding(s).`,
      results
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to execute duplicate scan' });
  }
});

// 3. Officer Scrutiny Determination on Duplicate Flag
router.post('/:id/resolve', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution_notes } = req.body;

    const allowed = ['CONFIRMED_DUPLICATE', 'REVIEWED_LEGITIMATE', 'DISMISSED'];
    if (!allowed.includes(status) || !resolution_notes) {
      res.status(400).json({ error: `Valid status [${allowed.join(', ')}] and scrutiny observations are required` });
      return;
    }

    const finding = await queryOne<any>(`SELECT * FROM duplicate_findings WHERE id = ?`, [id]);
    if (!finding) {
      res.status(404).json({ error: 'Duplicate finding record not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE duplicate_findings
       SET status = ?,
           reason = reason || '\n[Officer Note: ' || ? || ']',
           reviewed_by = ?,
           reviewed_at = ?
       WHERE id = ?`,
      [status, resolution_notes, req.user!.id, nowIso, id]
    );

    // If marked confirmed duplicate, mark FDR deficient
    if (status === 'CONFIRMED_DUPLICATE') {
      await run(
        `UPDATE fdr_instruments SET current_status = 'DEFICIENT', updated_at = ? WHERE id = ?`,
        [nowIso, finding.fdr_id]
      );
    }

    // Recalculate risk score
    await riskScoringService.calculateRisk(finding.fdr_id);

    await auditFromRequest(req, {
      action: 'DUPLICATE_SCRUTINY_DECISION',
      entityType: 'DUPLICATE_FINDING',
      entityId: id,
      institutionId: finding.institution_id,
      decisionReason: `Scrutiny determination: Marked as ${status}. Notes: ${resolution_notes}`
    });

    res.json({ message: `Duplicate correlation finding updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update duplicate finding' });
  }
});

export default router;
