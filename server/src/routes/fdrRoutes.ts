import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { duplicateDetectionService } from '../services/duplicateDetectionService.js';
import { riskScoringService } from '../services/riskScoringService.js';

const router = Router();

// 1. List FDRs with Search, Filter, Sort, Pagination, and Institution Isolation
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      status,
      riskLevel,
      bankName,
      institutionId,
      maturityRange, // '30', '60', '90', 'matured'
      page = '1',
      limit = '10',
      sortBy = 'maturity_date',
      sortOrder = 'ASC'
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClauses: string[] = ['f.is_archived = 0'];
    const params: any[] = [];

    // Institution Scope: If Institution Admin, strictly restrict to their assigned institution
    if (req.user!.role === 'INSTITUTION_ADMIN') {
      whereClauses.push('f.institution_id = ?');
      params.push(req.user!.institution_id);
    } else if (institutionId) {
      whereClauses.push('f.institution_id = ?');
      params.push(institutionId);
    }

    // Search query across FDR number, bank name, application ref, or institution name
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      whereClauses.push('(f.fdr_number LIKE ? OR f.bank_name LIKE ? OR f.linked_application_ref LIKE ? OR i.name LIKE ?)');
      params.push(term, term, term, term);
    }

    if (status) {
      whereClauses.push('f.current_status = ?');
      params.push(status);
    }

    if (riskLevel) {
      whereClauses.push('f.risk_level = ?');
      params.push(riskLevel);
    }

    if (bankName) {
      whereClauses.push('f.bank_name = ?');
      params.push(bankName);
    }

    // Maturity Range Filter
    const nowIso = new Date().toISOString().split('T')[0];
    if (maturityRange === 'matured') {
      whereClauses.push('f.maturity_date < ?');
      params.push(nowIso);
    } else if (maturityRange === '30' || maturityRange === '60' || maturityRange === '90') {
      const days = parseInt(maturityRange, 10);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetIso = targetDate.toISOString().split('T')[0];
      whereClauses.push('f.maturity_date >= ? AND f.maturity_date <= ?');
      params.push(nowIso, targetIso);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total
    const countResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       ${whereSql}`,
      params
    );
    const total = countResult?.total || 0;

    // Allowed sort columns to prevent SQL injection
    const allowedSorts = ['maturity_date', 'amount', 'fdr_number', 'risk_score', 'created_at', 'current_status'];
    const safeSortCol = allowedSorts.includes(sortBy) ? `f.${sortBy}` : 'f.maturity_date';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Fetch Page
    const rows = await query<any>(
      `SELECT f.*, i.name as institution_name, i.code as institution_code,
              u.name as assigned_officer_name,
              (SELECT COUNT(*) FROM documents d WHERE d.fdr_id = f.id) as documents_count,
              (SELECT COUNT(*) FROM duplicate_findings df WHERE df.fdr_id = f.id AND df.status = 'OPEN') as duplicate_alerts_count,
              (SELECT COUNT(*) FROM verification_records vr WHERE vr.fdr_id = f.id AND vr.resolution_status = 'UNRESOLVED') as unresolved_findings_count
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       LEFT JOIN users u ON f.assigned_officer_id = u.id
       ${whereSql}
       ORDER BY ${safeSortCol} ${safeOrder}
       LIMIT ${limitNum} OFFSET ${offset}`,
      params
    );

    res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    console.error('FDR search error:', err);
    res.status(500).json({ error: 'Failed to query FDR repository' });
  }
});

// 2. Get Single FDR with Full Lifecycle Details
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const fdr = await queryOne<any>(
      `SELECT f.*, i.name as institution_name, i.code as institution_code,
              i.registration_number as institution_registration, i.state as institution_state,
              i.city as institution_city, i.contact_email as institution_email,
              u.name as assigned_officer_name, u.email as assigned_officer_email
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       LEFT JOIN users u ON f.assigned_officer_id = u.id
       WHERE f.id = ?`,
      [id]
    );

    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    // Role check: Institution Admin CAN ONLY view their institution's FDRs
    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== fdr.institution_id) {
      res.status(403).json({ error: 'Unauthorized: Cross-institution access denied' });
      return;
    }

    // Linked Documents
    const documents = await query<any>(
      `SELECT * FROM documents WHERE fdr_id = ? ORDER BY version DESC, created_at DESC`,
      [id]
    );

    // Extraction Findings
    const extractions = await query<any>(
      `SELECT * FROM document_extractions WHERE fdr_id = ? ORDER BY created_at DESC`,
      [id]
    );

    // Verification Scrutiny Records
    const verifications = await query<any>(
      `SELECT vr.*, u.name as resolved_by_name
       FROM verification_records vr
       LEFT JOIN users u ON vr.resolved_by = u.id
       WHERE vr.fdr_id = ?
       ORDER BY vr.created_at DESC`,
      [id]
    );

    // Cross-Institution Duplicate Findings (Officers & Super Admin only)
    let duplicateFindings: any[] = [];
    if (req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'REGULATION_OFFICER') {
      duplicateFindings = await query<any>(
        `SELECT df.*, i_matched.name as matched_institution_name, f_matched.fdr_number as matched_fdr_number,
                f_matched.amount as matched_amount, f_matched.bank_name as matched_bank
         FROM duplicate_findings df
         JOIN institutions i_matched ON df.matched_institution_id = i_matched.id
         JOIN fdr_instruments f_matched ON df.matched_fdr_id = f_matched.id
         WHERE df.fdr_id = ?`,
        [id]
      );
    }

    // Risk Assessment Breakdown
    const riskAssessment = await queryOne<any>(
      `SELECT * FROM risk_assessments WHERE fdr_id = ?`,
      [id]
    );

    // Renewal History & Replacement Links
    const renewalHistory = await query<any>(
      `SELECT rr.*, u.name as decided_by_name,
              rep.fdr_number as replacement_fdr_number, rep.amount as replacement_amount
       FROM renewal_requests rr
       LEFT JOIN users u ON rr.decided_by = u.id
       LEFT JOIN fdr_instruments rep ON rr.replacement_fdr_id = rep.id
       WHERE rr.original_fdr_id = ? OR rr.replacement_fdr_id = ?
       ORDER BY rr.created_at DESC`,
      [id, id]
    );

    // Release / Refund Requests
    const releaseRequests = await query<any>(
      `SELECT rel.*, u1.name as first_auth_name, u2.name as second_auth_name
       FROM release_requests rel
       LEFT JOIN users u1 ON rel.first_authorized_by = u1.id
       LEFT JOIN users u2 ON rel.second_authorized_by = u2.id
       WHERE rel.fdr_id = ?
       ORDER BY rel.created_at DESC`,
      [id]
    );

    // Decision Evidence Traceability
    const decisionEvidence = await query<any>(
      `SELECT * FROM decision_evidence WHERE fdr_id = ? ORDER BY created_at DESC`,
      [id]
    );

    // Audit Trail for this entity
    const auditTimeline = await query<any>(
      `SELECT * FROM audit_events
       WHERE entity_type = 'FDR_INSTRUMENT' AND entity_id = ?
       ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      fdr,
      documents,
      extractions,
      verifications,
      duplicateFindings,
      riskAssessment,
      renewalHistory,
      releaseRequests,
      decisionEvidence,
      auditTimeline
    });
  } catch (err: any) {
    console.error('Get FDR error:', err);
    res.status(500).json({ error: 'Failed to retrieve FDR record details' });
  }
});

// 3. Create New FDR Instrument
router.post('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fdr_number,
      institution_id,
      bank_name,
      branch_name,
      ifsc_code,
      amount,
      currency = 'INR',
      deposit_type = 'SECURITY_DEPOSIT',
      linked_application_ref,
      issue_date,
      maturity_date,
      interest_rate,
      replacement_for_fdr_id
    } = req.body;

    // Field Validation
    if (!fdr_number || !bank_name || !amount || !issue_date || !maturity_date || !linked_application_ref) {
      res.status(400).json({ error: 'Missing mandatory fields: FDR number, Bank, Amount, Issue Date, Maturity Date, Application Ref' });
      return;
    }

    const effectiveInstId = req.user!.role === 'INSTITUTION_ADMIN' ? req.user!.institution_id : (institution_id || req.user!.institution_id);
    if (!effectiveInstId) {
      res.status(400).json({ error: 'Institution ID is required' });
      return;
    }

    // Chronology check
    if (new Date(maturity_date) <= new Date(issue_date)) {
      res.status(400).json({ error: 'Validation Error: Maturity date must be strictly after issue date' });
      return;
    }

    // Check for exact duplicate within same institution
    const duplicateInInst = await queryOne(
      `SELECT id FROM fdr_instruments WHERE institution_id = ? AND fdr_number = ? AND is_archived = 0`,
      [effectiveInstId, fdr_number.trim()]
    );
    if (duplicateInInst) {
      res.status(400).json({
        error: `Duplicate Submission Prohibited: FDR ${fdr_number} is already registered under this institution.`
      });
      return;
    }

    const id = `fdr-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    await run(
      `INSERT INTO fdr_instruments (
        id, fdr_number, institution_id, bank_name, branch_name, ifsc_code, amount,
        currency, deposit_type, linked_application_ref, issue_date, maturity_date,
        interest_rate, current_status, verification_status, risk_score, risk_level,
        replacement_for_fdr_id, renewal_status, is_archived, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', 'PENDING', 0, 'LOW', ?, ?, 0, ?, ?, ?)`,
      [
        id,
        fdr_number.trim(),
        effectiveInstId,
        bank_name.trim(),
        branch_name || 'Main Branch',
        ifsc_code || null,
        parseFloat(amount),
        currency,
        deposit_type,
        linked_application_ref.trim(),
        issue_date,
        maturity_date,
        interest_rate ? parseFloat(interest_rate) : null,
        replacement_for_fdr_id || null,
        replacement_for_fdr_id ? 'REPLACEMENT_SUBMITTED' : 'NONE',
        req.user!.id,
        nowIso,
        nowIso
      ]
    );

    // Trigger duplicate detection and risk scoring
    await duplicateDetectionService.scanFdr(id);
    await riskScoringService.calculateRisk(id);

    await auditFromRequest(req, {
      action: 'FDR_SUBMISSION',
      entityType: 'FDR_INSTRUMENT',
      entityId: id,
      institutionId: effectiveInstId,
      afterState: req.body,
      decisionReason: 'New FDR instrument registered into repository'
    });

    res.status(201).json({
      message: 'FDR instrument registered successfully and submitted for scrutiny',
      fdrId: id
    });
  } catch (err: any) {
    console.error('Create FDR error:', err);
    res.status(500).json({ error: 'Failed to register FDR instrument' });
  }
});

// 4. Update Permitted Fields
router.put('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [id]);

    if (!existing) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    if (req.user!.role === 'INSTITUTION_ADMIN' && req.user!.institution_id !== existing.institution_id) {
      res.status(403).json({ error: 'Unauthorized to edit this instrument' });
      return;
    }

    const { branch_name, ifsc_code, interest_rate, linked_application_ref } = req.body;
    const nowIso = new Date().toISOString();

    await run(
      `UPDATE fdr_instruments
       SET branch_name = COALESCE(?, branch_name),
           ifsc_code = COALESCE(?, ifsc_code),
           interest_rate = COALESCE(?, interest_rate),
           linked_application_ref = COALESCE(?, linked_application_ref),
           updated_at = ?
       WHERE id = ?`,
      [branch_name, ifsc_code, interest_rate, linked_application_ref, nowIso, id]
    );

    await auditFromRequest(req, {
      action: 'FDR_METADATA_UPDATE',
      entityType: 'FDR_INSTRUMENT',
      entityId: id,
      institutionId: existing.institution_id,
      beforeState: existing,
      afterState: req.body,
      decisionReason: 'Updated permitted instrument metadata'
    });

    res.json({ message: 'FDR record updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update FDR' });
  }
});

// 5. Assign Officer to FDR
router.post('/:id/assign', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { officerId } = req.body;

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [id]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR not found' });
      return;
    }

    const officer = await queryOne<any>(`SELECT name FROM users WHERE id = ? AND role = 'REGULATION_OFFICER'`, [officerId]);
    if (!officer) {
      res.status(400).json({ error: 'Invalid officer ID' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE fdr_instruments SET assigned_officer_id = ?, updated_at = ? WHERE id = ?`,
      [officerId, nowIso, id]
    );

    await auditFromRequest(req, {
      action: 'OFFICER_ASSIGNMENT',
      entityType: 'FDR_INSTRUMENT',
      entityId: id,
      institutionId: fdr.institution_id,
      decisionReason: `Assigned case scrutiny to Officer ${officer.name}`
    });

    res.json({ message: `Case successfully assigned to Officer ${officer.name}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to assign officer' });
  }
});

// 5b. Correct Extracted or Declared Field with Mandatory Reason and Audit Diff
router.post('/:id/correct-field', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fieldName, correctedValue, reason } = req.body;

    if (!fieldName || correctedValue === undefined || !reason || reason.trim().length < 5) {
      res.status(400).json({
        error: 'Field name, corrected value, and a mandatory detailed reason (min 5 chars) are required for regulatory corrections'
      });
      return;
    }

    const allowedFields = [
      'fdr_number',
      'bank_name',
      'branch_name',
      'ifsc_code',
      'amount',
      'issue_date',
      'maturity_date',
      'interest_rate',
      'linked_application_ref'
    ];

    if (!allowedFields.includes(fieldName)) {
      res.status(400).json({ error: `Field '${fieldName}' is not eligible for manual officer correction` });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [id]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    const previousValue = fdr[fieldName];
    let typedValue = correctedValue;
    if (fieldName === 'amount' || fieldName === 'interest_rate') {
      typedValue = parseFloat(correctedValue);
      if (isNaN(typedValue)) {
        res.status(400).json({ error: `Invalid numeric value for field '${fieldName}'` });
        return;
      }
    }

    // Chronology check if dates are modified
    const effIssue = fieldName === 'issue_date' ? typedValue : fdr.issue_date;
    const effMaturity = fieldName === 'maturity_date' ? typedValue : fdr.maturity_date;
    if (effIssue && effMaturity && new Date(effMaturity) <= new Date(effIssue)) {
      res.status(400).json({ error: 'Validation Error: Maturity date must be strictly after issue date' });
      return;
    }

    const nowIso = new Date().toISOString();

    // 1. Update instrument record
    await run(
      `UPDATE fdr_instruments SET ${fieldName} = ?, updated_at = ? WHERE id = ?`,
      [typedValue, nowIso, id]
    );

    // 2. Write immutable audit entry with before/after state diff and reason
    await auditFromRequest(req, {
      action: 'FIELD_CORRECTION',
      entityType: 'FDR_INSTRUMENT',
      entityId: id,
      institutionId: fdr.institution_id,
      beforeState: { field: fieldName, value: previousValue },
      afterState: { field: fieldName, value: typedValue },
      decisionReason: `Officer Correction: ${reason}`
    });

    // 3. Auto-resolve related verification discrepancies for this field
    await run(
      `UPDATE verification_records
       SET resolution_status = 'RESOLVED',
           resolved_by = ?,
           resolved_at = ?,
           officer_observation = COALESCE(officer_observation, '') || '\n[Resolved via field correction by ' || ? || ': ' || ? || ']'
       WHERE fdr_id = ? AND resolution_status = 'UNRESOLVED' AND (details LIKE ? OR discrepancies LIKE ? OR officer_observation LIKE ?)`,
      [
        req.user!.id,
        nowIso,
        req.user!.name,
        reason,
        id,
        `%${fieldName}%`,
        `%${fieldName}%`,
        `%${fieldName}%`
      ]
    );

    // 4. Update document_extractions if applicable
    if (fieldName === 'amount') {
      await run(
        `UPDATE document_extractions SET extracted_amount = ?, confirmed_by = ?, confirmed_at = ? WHERE fdr_id = ?`,
        [typedValue, req.user!.id, nowIso, id]
      );
    } else if (fieldName === 'fdr_number') {
      await run(
        `UPDATE document_extractions SET extracted_fdr_number = ?, confirmed_by = ?, confirmed_at = ? WHERE fdr_id = ?`,
        [typedValue, req.user!.id, nowIso, id]
      );
    }

    // 5. Trigger automatic re-scan and risk score recalculation
    await duplicateDetectionService.scanFdr(id);
    const updatedRisk = await riskScoringService.calculateRisk(id);

    const updatedFdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [id]);

    res.json({
      message: `Field '${fieldName}' successfully updated with audit trail trace. Risk score recalculated to ${updatedRisk.totalScore}.`,
      fieldName,
      previousValue,
      correctedValue: typedValue,
      updatedFdr,
      riskAssessment: updatedRisk
    });
  } catch (err: any) {
    console.error('Field correction error:', err);
    res.status(500).json({ error: 'Failed to correct field value' });
  }
});

// 6. Archive Record (Without destroying audit trail)
router.post('/:id/archive', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      res.status(400).json({ error: 'A justified reason is required to archive an FDR record' });
      return;
    }

    const fdr = await queryOne<any>(`SELECT * FROM fdr_instruments WHERE id = ?`, [id]);
    if (!fdr) {
      res.status(404).json({ error: 'FDR record not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE fdr_instruments SET is_archived = 1, current_status = 'ARCHIVED', updated_at = ? WHERE id = ?`,
      [nowIso, id]
    );

    await auditFromRequest(req, {
      action: 'FDR_ARCHIVED',
      entityType: 'FDR_INSTRUMENT',
      entityId: id,
      institutionId: fdr.institution_id,
      decisionReason: reason
    });

    res.json({ message: 'FDR instrument moved to archive repository. Audit trail retained.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive FDR record' });
  }
});

export default router;
