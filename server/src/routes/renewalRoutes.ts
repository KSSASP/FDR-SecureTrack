import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { readinessService } from '../services/readinessService.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. List Renewal Requests
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    let sql = `
      SELECT rr.*,
             orig.fdr_number as original_fdr_number, orig.amount as original_amount, orig.bank_name as original_bank, orig.maturity_date as original_maturity,
             rep.fdr_number as replacement_fdr_number, rep.amount as replacement_amount, rep.bank_name as replacement_bank, rep.maturity_date as replacement_maturity,
             i.name as institution_name, i.code as institution_code,
             u.name as decided_by_name
      FROM renewal_requests rr
      JOIN fdr_instruments orig ON rr.original_fdr_id = orig.id
      LEFT JOIN fdr_instruments rep ON rr.replacement_fdr_id = rep.id
      JOIN institutions i ON rr.institution_id = i.id
      LEFT JOIN users u ON rr.decided_by = u.id
    `;
    const params: any[] = [];

    if (req.user!.role === 'INSTITUTION_ADMIN') {
      sql += ` WHERE rr.institution_id = ?`;
      params.push(req.user!.institution_id);
    }

    sql += ` ORDER BY rr.created_at DESC`;
    const renewals = await query<any>(sql, params);

    res.json({ renewals });
  } catch (err: any) {
    console.error('List renewals error:', err);
    res.status(500).json({ error: 'Failed to retrieve renewal records' });
  }
});

// 2. Start Renewal Request (Institution initiates)
router.post('/initiate', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { original_fdr_id, reason, replacement_fdr_id } = req.body;

    if (!original_fdr_id || !reason) {
      res.status(400).json({ error: 'Original FDR ID and renewal justification reason are required' });
      return;
    }

    const orig = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [original_fdr_id]);
    if (!orig) {
      res.status(404).json({ error: 'Original FDR instrument not found' });
      return;
    }

    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== orig.institution_id) {
      res.status(403).json({ error: 'Unauthorized: Cannot initiate renewal for another institution' });
      return;
    }

    // Evaluate initial readiness
    const readiness = await readinessService.evaluateRenewalReadiness(original_fdr_id);

    const renewalId = `ren-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    await run(
      `INSERT INTO renewal_requests (
        id, original_fdr_id, replacement_fdr_id, institution_id, request_date, reason,
        readiness_status, readiness_details, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)`,
      [
        renewalId,
        original_fdr_id,
        replacement_fdr_id || null,
        orig.institution_id,
        nowIso.split('T')[0],
        reason,
        readiness.readinessStatus,
        JSON.stringify(readiness.checklist),
        nowIso,
        nowIso
      ]
    );

    // Update status on original instrument
    await run(
      `UPDATE fdr_instruments
       SET renewal_status = ?, updated_at = ?
       WHERE id = ?`,
      [replacement_fdr_id ? 'REPLACEMENT_SUBMITTED' : 'RENEWAL_REQUESTED', nowIso, original_fdr_id]
    );

    await auditFromRequest(req, {
      action: 'RENEWAL_REQUEST_INITIATED',
      entityType: 'RENEWAL_REQUEST',
      entityId: renewalId,
      institutionId: orig.institution_id,
      decisionReason: reason
    });

    res.status(201).json({
      message: 'Renewal request initiated and queued for officer scrutiny',
      renewalId,
      readiness
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to initiate renewal request' });
  }
});

// 3. Evaluate Renewal Readiness Prediction Checklist
router.get('/:fdrId/readiness', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const readiness = await readinessService.evaluateRenewalReadiness(fdrId);
    res.json({ readiness });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate renewal readiness' });
  }
});

// 4. Officer Review & Decision on Renewal/Replacement
router.post('/:id/review', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, officer_comments } = req.body;

    const allowed = ['ACCEPTED', 'REJECTED', 'CORRECTION_REQUIRED'];
    if (!allowed.includes(status) || !officer_comments) {
      res.status(400).json({ error: `Valid determination [${allowed.join(', ')}] and recorded scrutiny comments are required` });
      return;
    }

    const renewal = await queryOne<any>(`SELECT * FROM renewal_requests WHERE id = ?`, [id]);
    if (!renewal) {
      res.status(404).json({ error: 'Renewal request record not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE renewal_requests
       SET status = ?, officer_comments = ?, decision_date = ?, decided_by = ?, updated_at = ?
       WHERE id = ?`,
      [status, officer_comments, nowIso, req.user!.id, nowIso, id]
    );

    // Update original FDR renewal status
    let originalFdrRenewalStatus = 'REPLACEMENT_PENDING_REVIEW';
    if (status === 'ACCEPTED') {
      originalFdrRenewalStatus = 'REPLACEMENT_ACCEPTED';
      // Mark original FDR as replaced
      await run(`UPDATE fdr_instruments SET current_status = 'REPLACED', updated_at = ? WHERE id = ?`, [nowIso, renewal.original_fdr_id]);
      if (renewal.replacement_fdr_id) {
        await run(`UPDATE fdr_instruments SET current_status = 'VERIFIED', updated_at = ? WHERE id = ?`, [nowIso, renewal.replacement_fdr_id]);
      }
    } else if (status === 'REJECTED') {
      originalFdrRenewalStatus = 'REPLACEMENT_REJECTED';
    }

    await run(
      `UPDATE fdr_instruments SET renewal_status = ?, updated_at = ? WHERE id = ?`,
      [originalFdrRenewalStatus, nowIso, renewal.original_fdr_id]
    );

    // Decision Evidence Record
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'RENEWAL_DECISION', ?, '[]', ?, ?, ?, ?)`,
      [
        evId,
        renewal.original_fdr_id,
        req.user!.name,
        `Officer Determination on Replacement FDR: ${status}`,
        JSON.stringify({ comments: officer_comments, replacementId: renewal.replacement_fdr_id, decision: status }),
        status,
        nowIso
      ]
    );

    await riskScoringService.calculateRisk(renewal.original_fdr_id);

    await auditFromRequest(req, {
      action: 'RENEWAL_DECISION_RECORDED',
      entityType: 'RENEWAL_REQUEST',
      entityId: id,
      institutionId: renewal.institution_id,
      decisionReason: `Officer recorded decision: ${status}. Comments: ${officer_comments}`
    });

    res.json({ message: `Renewal decision recorded: ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record renewal decision' });
  }
});

export default router;
