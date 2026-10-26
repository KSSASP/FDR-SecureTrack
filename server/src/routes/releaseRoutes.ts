import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. List Release / Refund Requests
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    let sql = `
      SELECT rel.*,
             f.fdr_number, f.bank_name, f.amount, f.maturity_date, f.linked_application_ref,
             i.name as institution_name, i.code as institution_code,
             u1.name as first_authorizer_name, u2.name as second_authorizer_name
      FROM release_requests rel
      JOIN fdr_instruments f ON rel.fdr_id = f.id
      JOIN institutions i ON rel.institution_id = i.id
      LEFT JOIN users u1 ON rel.first_authorized_by = u1.id
      LEFT JOIN users u2 ON rel.second_authorized_by = u2.id
    `;
    const params: any[] = [];

    if (req.user!.role === 'INSTITUTION_ADMIN') {
      sql += ` WHERE rel.institution_id = ?`;
      params.push(req.user!.institution_id);
    }

    sql += ` ORDER BY rel.created_at DESC`;
    const requests = await query<any>(sql, params);

    res.json({ requests });
  } catch (err: any) {
    console.error('List release requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve release requests' });
  }
});

// 2. Submit Release Request (Institution Admin)
router.post('/submit', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdr_id, request_type = 'FULL_RELEASE', reason } = req.body;

    if (!fdr_id || !reason) {
      res.status(400).json({ error: 'FDR ID and release justification reason are required' });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [fdr_id]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== fdr.institution_id) {
      res.status(403).json({ error: 'Unauthorized to request release for another institution' });
      return;
    }

    const id = `rel-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    const defaultEligibility = {
      moratoriumPeriodCompleted: true,
      noPendingAuditObservations: true,
      originalInstrumentReturned: true,
      noLitigationPending: true,
      councilApprovalAttached: true
    };

    await run(
      `INSERT INTO release_requests (
        id, fdr_id, institution_id, request_type, reason, submission_date, status,
        eligibility_checklist, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?)`,
      [
        id,
        fdr_id,
        fdr.institution_id,
        request_type,
        reason,
        nowIso.split('T')[0],
        JSON.stringify(defaultEligibility),
        nowIso,
        nowIso
      ]
    );

    // Update status on FDR instrument
    await run(
      `UPDATE fdr_instruments SET current_status = 'RELEASE_REQUESTED', updated_at = ? WHERE id = ?`,
      [nowIso, fdr_id]
    );

    await auditFromRequest(req, {
      action: 'RELEASE_REQUEST_SUBMITTED',
      entityType: 'RELEASE_REQUEST',
      entityId: id,
      institutionId: fdr.institution_id,
      decisionReason: `Submitted deposit release application: ${reason}`
    });

    res.status(201).json({
      message: 'Release application successfully registered and routed to regulation officer worklist',
      requestId: id
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit release application' });
  }
});

// 3. Officer Review & Recommendation (Tier 1)
router.post('/:id/review', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, officer_observations, eligibility_checklist } = req.body;

    const allowed = ['UNDER_REVIEW', 'RECOMMENDED', 'ADDITIONAL_INFO_REQUIRED', 'REJECTED'];
    if (!allowed.includes(status) || !officer_observations) {
      res.status(400).json({ error: `Valid status [${allowed.join(', ')}] and observations are required` });
      return;
    }

    const request = await queryOne<any>(`SELECT * FROM release_requests WHERE id = ?`, [id]);
    if (!request) {
      res.status(404).json({ error: 'Release request not found' });
      return;
    }

    const nextStatus = status === 'RECOMMENDED' ? 'AWAITING_COMPETENT_AUTHORITY' : status;
    const nowIso = new Date().toISOString();

    await run(
      `UPDATE release_requests
       SET status = ?,
           officer_observations = ?,
           eligibility_checklist = COALESCE(?, eligibility_checklist),
           first_authorized_by = ?,
           first_authorized_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [nextStatus, officer_observations, eligibility_checklist ? JSON.stringify(eligibility_checklist) : null, req.user!.id, nowIso, nowIso, id]
    );

    // If rejected, revert FDR status
    if (status === 'REJECTED') {
      await run(`UPDATE fdr_instruments SET current_status = 'VERIFIED', updated_at = ? WHERE id = ?`, [nowIso, request.fdr_id]);
    }

    // Record Decision Evidence
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'RELEASE_DECISION', ?, '[]', ?, ?, ?, ?)`,
      [
        evId,
        request.fdr_id,
        req.user!.name,
        `Officer Tier-1 Release Scrutiny: ${status}`,
        JSON.stringify({ observations: officer_observations, determination: status }),
        nextStatus,
        nowIso
      ]
    );

    await auditFromRequest(req, {
      action: 'RELEASE_SCRUTINY_REVIEW',
      entityType: 'RELEASE_REQUEST',
      entityId: id,
      institutionId: request.institution_id,
      decisionReason: `Tier 1 Scrutiny: ${status}. Observations: ${officer_observations}`
    });

    res.json({ message: `Release request updated to: ${nextStatus}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record scrutiny recommendation' });
  }
});

// 4. Competent Authority Final Authorization (Tier 2 - Super Admin / Authorized Chief Officer)
router.post('/:id/authorize', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { decision, decision_comments } = req.body; // 'AUTHORIZED' | 'REJECTED'

    if (!['AUTHORIZED', 'REJECTED'].includes(decision) || !decision_comments) {
      res.status(400).json({ error: 'Formal decision (AUTHORIZED/REJECTED) and supervisory comments are required' });
      return;
    }

    const request = await queryOne<any>(`SELECT * FROM release_requests WHERE id = ?`, [id]);
    if (!request) {
      res.status(404).json({ error: 'Release request not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE release_requests
       SET status = ?,
           decision_comments = ?,
           second_authorized_by = ?,
           second_authorized_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [decision, decision_comments, req.user!.id, nowIso, nowIso, id]
    );

    // If authorized, mark FDR as RELEASED
    const fdrStatus = decision === 'AUTHORIZED' ? 'RELEASED' : 'VERIFIED';
    await run(
      `UPDATE fdr_instruments SET current_status = ?, updated_at = ? WHERE id = ?`,
      [fdrStatus, nowIso, request.fdr_id]
    );

    // Record Decision Evidence
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'RELEASE_DECISION', ?, '[]', ?, ?, ?, ?)`,
      [
        evId,
        request.fdr_id,
        req.user!.name,
        `Competent Authority Tier-2 Final Decision: ${decision}`,
        JSON.stringify({ comments: decision_comments, decision, note: 'Administrative release order recorded. No financial disbursement executed.' }),
        decision,
        nowIso
      ]
    );

    await riskScoringService.calculateRisk(request.fdr_id);

    await auditFromRequest(req, {
      action: 'RELEASE_AUTHORIZATION_DECISION',
      entityType: 'RELEASE_REQUEST',
      entityId: id,
      institutionId: request.institution_id,
      decisionReason: `Competent Authority Tier-2 decision: ${decision}. Comments: ${decision_comments}`
    });

    res.json({ message: `Administrative release authorization recorded: ${decision}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record authorization decision' });
  }
});

export default router;
