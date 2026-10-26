import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { priorityWorklistService } from '../services/priorityWorklistService.js';
import { queryOne, run } from '../db/database.js';
import { auditFromRequest } from '../services/auditService.js';
import { riskScoringService } from '../services/riskScoringService.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 1. Get Officer Worklist
router.get('/officer', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { filter } = req.query as { filter?: string };
    const worklist = await priorityWorklistService.getOfficerWorklist(req.user!.id, filter);

    res.json({
      worklist,
      totalCount: worklist.length,
      criticalCount: worklist.filter(w => w.priorityLabel === 'CRITICAL').length,
      urgentCount: worklist.filter(w => w.priorityLabel === 'URGENT').length,
      normalCount: worklist.filter(w => w.priorityLabel === 'NORMAL').length
    });
  } catch (err: any) {
    console.error('Worklist error:', err);
    res.status(500).json({ error: 'Failed to retrieve officer workbench' });
  }
});

// 2. Assign Case from Worklist
router.post('/:fdrId/assign', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const { officerId } = req.body;
    const targetOfficerId = officerId || req.user!.id;

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [fdrId]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    const officer = await queryOne<any>(`SELECT name FROM users WHERE id = ?`, [targetOfficerId]);
    if (!officer) {
      res.status(400).json({ error: 'Assigned officer not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE fdr_instruments SET assigned_officer_id = ?, updated_at = ? WHERE id = ?`,
      [targetOfficerId, nowIso, fdrId]
    );

    await auditFromRequest(req, {
      action: 'OFFICER_ASSIGNED',
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: fdr.institution_id,
      decisionReason: `Assigned scrutiny workflow to ${officer.name}`
    });

    res.json({ message: `Case successfully assigned to ${officer.name}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assign officer' });
  }
});

// 3. Escalate Case to Competent Authority
router.post('/:fdrId/escalate', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const { escalationReason, urgency = 'CRITICAL' } = req.body;

    if (!escalationReason || escalationReason.trim().length < 5) {
      res.status(400).json({ error: 'Mandatory escalation justification required' });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [fdrId]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    const notifId = `notif-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    // Create high-priority escalation notification for Super Admin
    await run(
      `INSERT INTO notifications (
        id, event_type, fdr_id, institution_id, title, message, priority, target_role, is_read, is_escalated, created_at
      ) VALUES (?, 'OFFICER_ESCALATION', ?, ?, ?, ?, ?, 'SUPER_ADMIN', 0, 1, ?)`,
      [
        notifId,
        fdrId,
        fdr.institution_id,
        `Case Escalation: FDR ${fdr.fdr_number}`,
        `Officer ${req.user!.name} escalated FDR ${fdr.fdr_number} for administrative review: ${escalationReason}`,
        urgency,
        nowIso
      ]
    );

    // Record in decision evidence
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'OFFICER_OVERRIDE', ?, ?, ?, 'ESCALATED', ?)`,
      [
        `ev-${uuidv4()}`,
        fdrId,
        `Officer ${req.user!.name} (${req.user!.role})`,
        `Formal case escalation: ${escalationReason}`,
        JSON.stringify({ escalatedBy: req.user!.name, reason: escalationReason, urgency }),
        nowIso
      ]
    );

    await auditFromRequest(req, {
      action: 'CASE_ESCALATED',
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: fdr.institution_id,
      decisionReason: `Escalated to Super Admin: ${escalationReason}`
    });

    res.json({ message: 'Case successfully escalated to Competent Regulatory Authority' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to escalate case' });
  }
});

// 4. Update Case Scrutiny Status (Approve / Request Correction / Mark Deficient)
router.post('/:fdrId/action', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const { actionType, comments } = req.body;

    const allowed = ['APPROVE_VERIFIED', 'REQUEST_CORRECTION', 'MARK_DEFICIENT'];
    if (!allowed.includes(actionType)) {
      res.status(400).json({ error: `Valid actionType [${allowed.join(', ')}] required` });
      return;
    }

    if (!comments || comments.trim().length < 5) {
      res.status(400).json({ error: 'Mandatory scrutiny comments required for regulatory actions' });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [fdrId]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    let newStatus = fdr.current_status;
    let newVerStatus = fdr.verification_status;

    if (actionType === 'APPROVE_VERIFIED') {
      newStatus = 'VERIFIED';
      newVerStatus = 'DEMO_VERIFIED';
    } else if (actionType === 'REQUEST_CORRECTION') {
      newStatus = 'DEFICIENT';
    } else if (actionType === 'MARK_DEFICIENT') {
      newStatus = 'DEFICIENT';
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE fdr_instruments
       SET current_status = ?, verification_status = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, newVerStatus, nowIso, fdrId]
    );

    // Record verification finding
    await run(
      `INSERT INTO verification_records (
        id, fdr_id, stage, source, status, details, officer_observation, resolution_status, resolved_by, resolved_at, created_at
      ) VALUES (?, ?, 'OFFICER_REVIEW', 'OFFICER', ?, ?, ?, 'RESOLVED', ?, ?, ?)`,
      [
        `ver-${uuidv4()}`,
        fdrId,
        actionType === 'APPROVE_VERIFIED' ? 'PASS' : 'WARNING',
        JSON.stringify({ actionType, executedBy: req.user!.name }),
        comments,
        req.user!.id,
        nowIso,
        nowIso
      ]
    );

    // Recalculate risk score
    await riskScoringService.calculateRisk(fdrId);

    await auditFromRequest(req, {
      action: `OFFICER_${actionType}`,
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: fdr.institution_id,
      beforeState: { current_status: fdr.current_status, verification_status: fdr.verification_status },
      afterState: { current_status: newStatus, verification_status: newVerStatus },
      decisionReason: comments
    });

    res.json({
      message: `Case status updated to ${newStatus}`,
      currentStatus: newStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record officer action' });
  }
});

export default router;
