import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { bankVerificationAdapter } from '../services/bankVerificationAdapter.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. Trigger Bank Verification (Simulated Core Banking Adapter)
router.post('/verify-bank/:fdrId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;

    const fdr = await queryOne<any>(
      `SELECT f.*, i.name as institution_name
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       WHERE f.id = ?`,
      [fdrId]
    );

    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    // Call bank verification adapter
    const result = await bankVerificationAdapter.verifyFdr({
      fdrNumber: fdr.fdr_number,
      bankName: fdr.bank_name,
      branchName: fdr.branch_name,
      amount: fdr.amount,
      institutionName: fdr.institution_name
    });

    const nowIso = new Date().toISOString();
    const verId = `ver-${uuidv4()}`;

    // Record verification finding
    await run(
      `INSERT INTO verification_records (
        id, fdr_id, stage, source, status, details, discrepancies, officer_observation,
        resolution_status, created_at
      ) VALUES (?, ?, 'BANK_SIMULATION', 'SIMULATED_BANK_API', ?, ?, ?, ?, ?, ?)`,
      [
        verId,
        fdrId,
        result.status,
        JSON.stringify({
          adapter: result.adapterName,
          confirmationReference: result.confirmationReference,
          isSimulated: result.isSimulated,
          disclaimer: result.disclaimer,
          verifiedAmount: result.verifiedAmount,
          verifiedHolder: result.verifiedHolder
        }),
        JSON.stringify(result.discrepancies),
        result.status === 'DEMO_VERIFIED'
          ? 'Confirmation received from simulated core banking interface'
          : 'Discrepancy detected in simulated interbank records',
        result.status === 'DEMO_VERIFIED' ? 'RESOLVED' : 'UNRESOLVED',
        nowIso
      ]
    );

    // Update FDR instrument status
    const newStatus = result.status === 'DEMO_VERIFIED' ? 'VERIFIED' : 'DEFICIENT';
    await run(
      `UPDATE fdr_instruments
       SET verification_status = ?,
           current_status = CASE WHEN current_status = 'SUBMITTED' OR current_status = 'PENDING_VERIFICATION' THEN ? ELSE current_status END,
           updated_at = ?
       WHERE id = ?`,
      [result.status, newStatus, nowIso, fdrId]
    );

    // Record Decision Evidence
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'VERIFICATION_SCRUTINY', ?, '[]', ?, ?, ?, ?)`,
      [
        evId,
        fdrId,
        `ADAPTER:${result.adapterName}`,
        `Bank Scrutiny Outcome: ${result.status} (Ref: ${result.confirmationReference || 'N/A'})`,
        JSON.stringify(result),
        result.status,
        nowIso
      ]
    );

    // Recalculate Risk Score
    const updatedRisk = await riskScoringService.calculateRisk(fdrId);

    await auditFromRequest(req, {
      action: 'BANK_VERIFICATION_CHECK',
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: fdr.institution_id,
      decisionReason: `Bank verification executed via ${result.adapterName}. Result: ${result.status}`
    });

    res.json({
      message: 'Bank verification check executed',
      result,
      updatedRisk
    });
  } catch (err: any) {
    console.error('Bank verification error:', err);
    res.status(500).json({ error: 'Failed to execute bank verification' });
  }
});

// 2. Officer Resolves or Overrides Discrepancy
router.post('/resolve-discrepancy/:recordId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId } = req.params;
    const { resolution_status, officer_observation, reason } = req.body;

    if (!resolution_status || !reason) {
      res.status(400).json({ error: 'Resolution status (RESOLVED/EXCEPTION_APPROVED) and explanatory reason are mandatory' });
      return;
    }

    const record = await queryOne<any>(`SELECT * FROM verification_records WHERE id = ?`, [recordId]);
    if (!record) {
      res.status(404).json({ error: 'Verification record not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE verification_records
       SET resolution_status = ?,
           officer_observation = COALESCE(?, officer_observation),
           resolved_by = ?,
           resolved_at = ?
       WHERE id = ?`,
      [resolution_status, officer_observation, req.user!.id, nowIso, recordId]
    );

    // Recalculate risk score now that discrepancy is resolved
    await riskScoringService.calculateRisk(record.fdr_id);

    // Decision evidence trace
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'OFFICER_OVERRIDE', ?, '[]', ?, ?, ?, ?)`,
      [
        evId,
        record.fdr_id,
        req.user!.name,
        `Officer Scrutiny Determination: Marked discrepancy finding as ${resolution_status}`,
        JSON.stringify({ reason, previousStatus: record.resolution_status, newStatus: resolution_status }),
        resolution_status,
        nowIso
      ]
    );

    await auditFromRequest(req, {
      action: 'DISCREPANCY_RESOLVED',
      entityType: 'VERIFICATION_RECORD',
      entityId: recordId,
      institutionId: null,
      decisionReason: reason
    });

    res.json({ message: `Finding marked as ${resolution_status} with recorded officer observations` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update discrepancy finding' });
  }
});

// 3. Officer Directly Records Document Scrutiny Observation & Determination
router.post('/record-scrutiny/:fdrId', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fdrId } = req.params;
    const { determination, officer_observation, document_id } = req.body;

    if (!determination || !officer_observation || officer_observation.trim().length < 5) {
      res.status(400).json({ error: 'Scrutiny determination and a mandatory observation justification (min 5 chars) are required' });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [fdrId]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR instrument record not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    const verId = `ver-scrutiny-${uuidv4().substring(0, 8)}`;

    const resolutionStatus = determination === 'DEMO_VERIFIED' ? 'RESOLVED' : 'UNRESOLVED';
    const findingStatus = determination === 'DEMO_VERIFIED' ? 'PASS' : (determination === 'DEMO_MISMATCH' ? 'WARNING' : 'NEEDS_REVIEW');

    await run(
      `INSERT INTO verification_records (
        id, fdr_id, stage, source, status, details, discrepancies, officer_observation,
        resolution_status, resolved_by, resolved_at, created_at
      ) VALUES (?, ?, 'OFFICER_SCRUTINY', 'OFFICER_MANUAL_REVIEW', ?, ?, '[]', ?, ?, ?, ?, ?)`,
      [
        verId,
        fdrId,
        findingStatus,
        JSON.stringify({
          documentId: document_id || null,
          officerName: req.user!.name,
          officerRole: req.user!.role,
          determination,
          isSimulated: true,
          disclaimer: 'DEMO / SIMULATED OFFICER SCRUTINY'
        }),
        officer_observation,
        resolutionStatus,
        req.user!.id,
        nowIso,
        nowIso
      ]
    );

    // Update FDR verification status and current status
    let newCurrentStatus = fdr.current_status;
    if (determination === 'DEMO_VERIFIED') {
      if (['SUBMITTED', 'PENDING_VERIFICATION'].includes(fdr.current_status)) {
        newCurrentStatus = 'VERIFIED';
      }
    } else if (determination === 'DEMO_MISMATCH') {
      newCurrentStatus = 'DEFICIENT';
    }

    await run(
      `UPDATE fdr_instruments
       SET verification_status = ?,
           current_status = ?,
           assigned_officer_id = COALESCE(assigned_officer_id, ?),
           updated_at = ?
       WHERE id = ?`,
      [determination, newCurrentStatus, req.user!.id, nowIso, fdrId]
    );

    // Record Decision Evidence
    const evId = `ev-${uuidv4()}`;
    await run(
      `INSERT INTO decision_evidence (
        id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
        findings_summary, evidence_payload, outcome, created_at
      ) VALUES (?, ?, 'OFFICER_SCRUTINY', ?, ?, ?, ?, ?, ?)`,
      [
        evId,
        fdrId,
        req.user!.name,
        JSON.stringify(document_id ? [document_id] : []),
        `Officer Scrutiny Determination: ${determination}. Notes: ${officer_observation}`,
        JSON.stringify({ determination, officer_observation, document_id }),
        determination,
        nowIso
      ]
    );

    // Recalculate Risk Score
    const updatedRisk = await riskScoringService.calculateRisk(fdrId);

    // Log to Audit Trail
    await auditFromRequest(req, {
      action: 'OFFICER_SCRUTINY_DETERMINATION',
      entityType: 'FDR_INSTRUMENT',
      entityId: fdrId,
      institutionId: fdr.institution_id,
      beforeState: { verification_status: fdr.verification_status, current_status: fdr.current_status },
      afterState: { verification_status: determination, current_status: newCurrentStatus },
      decisionReason: officer_observation
    });

    res.json({
      message: `Scrutiny determination recorded as ${determination}`,
      determination,
      updatedRisk
    });
  } catch (err: any) {
    console.error('Record scrutiny error:', err);
    res.status(500).json({ error: 'Failed to record scrutiny observation' });
  }
});

export default router;
