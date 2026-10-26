import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';

export interface RiskFactor {
  name: string;
  points: number;
  category:
    | 'DISCREPANCY'
    | 'DUPLICATE'
    | 'MISSING_DOC'
    | 'VERIFICATION'
    | 'OVERDUE'
    | 'ALTERATION'
    | 'REGULATORY'
    | 'DATE_INCONSISTENCY'
    | 'AMOUNT_MISMATCH'
    | 'BASELINE';
  evidence: string;
  evidenceReference?: string;
  explanation: string;
  recommendedAction: string;
  resolved: boolean;
}

export interface RiskScoreResult {
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewPriorityLabel: 'Routine Monitoring' | 'Standard Review' | 'Priority Scrutiny' | 'Immediate Action Required';
  scoreDisclaimer: string;
  factors: RiskFactor[];
  recommendedNextActions: string[];
  calculatedAt: string;
}

export class RiskScoringService {
  /**
   * Recalculate explainable, evidence-linked risk score for a given FDR
   */
  async calculateRisk(fdrId: string): Promise<RiskScoreResult> {
    const fdr = await queryOne<any>(
      `SELECT f.*, i.status as institution_status, i.name as institution_name, i.code as institution_code
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       WHERE f.id = ?`,
      [fdrId]
    );

    if (!fdr) {
      throw new Error(`FDR record ${fdrId} not found`);
    }

    // Load admin-configured weights from system_configs
    const weightsConfig = await query<any>(
      `SELECT key, value FROM system_configs WHERE key LIKE 'RISK_WEIGHT_%'`
    );
    const weights: Record<string, number> = {
      RISK_WEIGHT_DISCREPANCY: 25,
      RISK_WEIGHT_DUPLICATE: 30,
      RISK_WEIGHT_MISSING_DOC: 20,
      RISK_WEIGHT_UNVERIFIED_BANK: 15,
      RISK_WEIGHT_OVERDUE_RENEWAL: 15,
      RISK_WEIGHT_DATE_INCONSISTENCY: 20,
      RISK_WEIGHT_AMOUNT_MISMATCH: 25
    };
    for (const w of weightsConfig) {
      const parsed = parseInt(w.value, 10);
      if (!isNaN(parsed)) {
        weights[w.key] = parsed;
      }
    }

    const factors: RiskFactor[] = [];
    let currentScore = 0;

    // 1. Date Inconsistency Checks
    if (fdr.issue_date && fdr.maturity_date) {
      const issue = new Date(fdr.issue_date);
      const maturity = new Date(fdr.maturity_date);

      if (maturity <= issue) {
        const pts = weights.RISK_WEIGHT_DATE_INCONSISTENCY || 20;
        currentScore += pts;
        factors.push({
          name: 'Chronological Inconsistency: Inverted Term Dates',
          points: pts,
          category: 'DATE_INCONSISTENCY',
          evidence: `Maturity date (${fdr.maturity_date}) is on or before issue date (${fdr.issue_date})`,
          evidenceReference: `FDR Instrument record ${fdr.id}`,
          explanation: 'Fixed deposit receipts must possess a future maturity date relative to issue. Inverted dates signify invalid document metadata or clerical entry error.',
          recommendedAction: 'Verify original physical or digital certificate scan and execute field correction with authorized reason.',
          resolved: false
        });
      } else {
        const tenureDays = Math.round((maturity.getTime() - issue.getTime()) / (1000 * 3600 * 24));
        if (tenureDays < 30) {
          const pts = 10;
          currentScore += pts;
          factors.push({
            name: 'Atypically Short Deposit Tenure',
            points: pts,
            category: 'DATE_INCONSISTENCY',
            evidence: `Deposit tenure spans only ${tenureDays} days (${fdr.issue_date} to ${fdr.maturity_date})`,
            evidenceReference: `FDR Instrument record ${fdr.id}`,
            explanation: 'Regulatory security deposits typically require minimum 1-year or 3-year commitments. Abnormally short tenures require regulatory guideline check.',
            recommendedAction: 'Confirm whether special regulatory approval allows short-term security deposit tenure.',
            resolved: false
          });
        }
      }
    }

    // 2. Amount Mismatch Checks (Between FDR record and extracted document)
    const extractions = await query<any>(
      `SELECT e.*, d.original_filename
       FROM document_extractions e
       JOIN documents d ON e.document_id = d.id
       WHERE e.fdr_id = ?
       ORDER BY e.created_at DESC`,
      [fdrId]
    );

    for (const ext of extractions) {
      if (ext.extracted_amount && Math.abs(ext.extracted_amount - fdr.amount) >= 1) {
        const pts = weights.RISK_WEIGHT_AMOUNT_MISMATCH || 25;
        currentScore += pts;
        factors.push({
          name: 'Amount Mismatch Against Extracted Document',
          points: pts,
          category: 'AMOUNT_MISMATCH',
          evidence: `Declared repository amount (₹${fdr.amount.toLocaleString('en-IN')}) does not match extracted certificate amount (₹${ext.extracted_amount.toLocaleString('en-IN')} in ${ext.original_filename})`,
          evidenceReference: `Document Extraction ${ext.id} (${ext.original_filename})`,
          explanation: 'Discrepancy between declared portal value and OCR-extracted certificate value increases risk of clerical misrepresentation or deposit deficit.',
          recommendedAction: 'Perform side-by-side document scrutiny. Either adjust declared amount to match certified document or request re-upload of correct instrument.',
          resolved: false
        });
        break; // Count once
      }
    }

    // 3. Document Tampering Indicators from Extractions
    let hasTamperingIndicator = false;
    let tamperingDesc = '';
    let tamperingExtRef = '';
    for (const ext of extractions) {
      if (ext.tampering_indicators) {
        try {
          const indicators = JSON.parse(ext.tampering_indicators);
          const criticals = indicators.filter(
            (i: any) =>
              i.severity === 'CRITICAL' ||
              i.label?.includes('alteration') ||
              i.indicator?.toLowerCase().includes('mismatch') ||
              i.indicator?.toLowerCase().includes('tamper')
          );
          if (criticals.length > 0) {
            hasTamperingIndicator = true;
            tamperingDesc = criticals.map((c: any) => c.indicator).join('; ');
            tamperingExtRef = `Document Extraction ${ext.id}`;
            break;
          }
        } catch (_) {}
      }
    }

    if (hasTamperingIndicator) {
      const tampPoints = 20;
      currentScore += tampPoints;
      factors.push({
        name: 'Document Scanner Alteration Flag',
        points: tampPoints,
        category: 'ALTERATION',
        evidence: `Automated scanner detected possible visual or layout alteration: ${tamperingDesc}`,
        evidenceReference: tamperingExtRef,
        explanation: 'Optical document inspection flagged potential text overlay, inconsistent typography, or altered numerical values.',
        recommendedAction: 'Initiate independent confirmation directly with issuing bank branch before taking approval action.',
        resolved: false
      });
    }

    // 4. Verification Records Discrepancies
    const discrepancies = await query<any>(
      `SELECT * FROM verification_records
       WHERE fdr_id = ? AND status IN ('FAIL', 'WARNING') AND resolution_status = 'UNRESOLVED'`,
      [fdrId]
    );

    if (discrepancies.length > 0) {
      const discPoints = weights.RISK_WEIGHT_DISCREPANCY;
      currentScore += discPoints;
      const firstDisc = discrepancies[0];
      factors.push({
        name: 'Unresolved Scrutiny Discrepancies',
        points: discPoints,
        category: 'DISCREPANCY',
        evidence: `Detected ${discrepancies.length} unresolved discrepancy finding(s) on file (Latest: ${firstDisc.officer_observation || 'Field verification mismatch'})`,
        evidenceReference: `Verification Record ${firstDisc.id}`,
        explanation: 'Previous automated verification or officer scrutiny logged unresolved discrepancies that must be explicitly resolved.',
        recommendedAction: 'Open Scrutiny Workbench to review specific discrepancy observations and resolve with mandatory reason.',
        resolved: false
      });
    }

    // 5. Cross-Institution Duplicate Signals
    const openDuplicates = await query<any>(
      `SELECT df.*, i_cand.name as matched_inst_name, f_cand.fdr_number as matched_fdr_num
       FROM duplicate_findings df
       JOIN institutions i_cand ON df.matched_institution_id = i_cand.id
       JOIN fdr_instruments f_cand ON df.matched_fdr_id = f_cand.id
       WHERE df.fdr_id = ? AND df.status IN ('OPEN', 'CONFIRMED_DUPLICATE')`,
      [fdrId]
    );

    if (openDuplicates.length > 0) {
      const exactMatch = openDuplicates.find(d => d.match_category === 'EXACT_DUPLICATE');
      if (exactMatch) {
        const dupPoints = weights.RISK_WEIGHT_DUPLICATE;
        currentScore += dupPoints;
        factors.push({
          name: 'Cross-Institution Identifier Collision Alert',
          points: dupPoints,
          category: 'DUPLICATE',
          evidence: `Direct collision: Instrument number ${fdr.fdr_number} is identically registered under ${exactMatch.matched_inst_name} (${exactMatch.matched_fdr_num})`,
          evidenceReference: `Duplicate Finding ${exactMatch.id} (Matched FDR ${exactMatch.matched_fdr_id})`,
          explanation: 'Two separate institutions have submitted deposit certificates bearing identical normalized FDR numbers and issuing bank details. High priority review required to prevent double-encumbrance.',
          recommendedAction: 'Execute cross-institution duplicate review. Issue inquiry to both institutions and request verified original certified letter from bank branch manager.',
          resolved: false
        });
      } else {
        const potentialMatch = openDuplicates[0];
        const dupPoints = Math.round(weights.RISK_WEIGHT_DUPLICATE * 0.65);
        currentScore += dupPoints;
        factors.push({
          name: 'Potential Cross-Institution Multi-Attribute Overlap',
          points: dupPoints,
          category: 'DUPLICATE',
          evidence: `Multi-signal overlap found with ${openDuplicates.length} registered case(s) including ${potentialMatch.matched_inst_name}`,
          evidenceReference: `Duplicate Finding ${potentialMatch.id}`,
          explanation: 'High attribute similarity (bank, amount, and maturity window) indicates possible inadvertent duplicate submission or split deposit entry.',
          recommendedAction: 'Review candidate comparison in Duplicate Scrutiny view to determine whether records represent independent legitimate deposits.',
          resolved: false
        });
      }
    }

    // 6. Missing Mandatory Supporting Documents
    const docs = await query<any>(
      `SELECT document_type FROM documents WHERE fdr_id = ? AND status != 'REJECTED'`,
      [fdrId]
    );
    const docTypes = new Set(docs.map(d => d.document_type));
    const missingDocs: string[] = [];
    if (!docTypes.has('FDR_CERTIFICATE')) missingDocs.push('Fixed Deposit Receipt Certificate');

    if (missingDocs.length > 0) {
      const docPoints = weights.RISK_WEIGHT_MISSING_DOC;
      currentScore += docPoints;
      factors.push({
        name: 'Missing Mandatory Primary Document',
        points: docPoints,
        category: 'MISSING_DOC',
        evidence: `Instrument is missing primary verification artifact: ${missingDocs.join(', ')}`,
        evidenceReference: `Documents repository for FDR ${fdr.id}`,
        explanation: 'Regulatory approval cannot proceed without certified document copy uploaded and verified.',
        recommendedAction: 'Notify institution administrator to upload official PDF/image scan of deposit certificate.',
        resolved: false
      });
    }

    // 7. Simulated Bank Verification Gateway Status
    if (fdr.verification_status === 'DEMO_MISMATCH') {
      const bankPoints = weights.RISK_WEIGHT_UNVERIFIED_BANK;
      currentScore += bankPoints;
      factors.push({
        name: 'Simulated Bank Gateway Mismatch',
        points: bankPoints,
        category: 'VERIFICATION',
        evidence: 'Simulated core banking gateway reported discrepancies in lien status, branch identifier, or depositor title',
        evidenceReference: `FDR verification status DEMO_MISMATCH`,
        explanation: 'Electronic bank check failed to confirm deposit parameters. (Note: Result produced via simulated bank adapter for demonstration purposes).',
        recommendedAction: 'Request manual signed and stamped bank confirmation letter from the issuing branch.',
        resolved: false
      });
    } else if (fdr.verification_status === 'PENDING') {
      const pendingPoints = 5;
      currentScore += pendingPoints;
      factors.push({
        name: 'Pending Independent Bank Scrutiny',
        points: pendingPoints,
        category: 'VERIFICATION',
        evidence: 'Awaiting scheduled bank verification check or physical branch confirmation letter',
        evidenceReference: `FDR verification status PENDING`,
        explanation: 'Independent confirmation from issuing bank has not yet been logged.',
        recommendedAction: 'Trigger simulated bank verification check or record branch verification letter.',
        resolved: false
      });
    }

    // 8. Missing Key Metadata Fields (IFSC, Interest Rate, Branch)
    const missingFields: string[] = [];
    if (!fdr.ifsc_code) missingFields.push('IFSC Code');
    if (!fdr.interest_rate) missingFields.push('Interest Rate');
    if (!fdr.branch_name || fdr.branch_name === 'Main Branch') missingFields.push('Specific Branch Name');

    if (missingFields.length >= 2) {
      const fieldPts = 10;
      currentScore += fieldPts;
      factors.push({
        name: 'Incomplete Instrument Metadata',
        points: fieldPts,
        category: 'REGULATORY',
        evidence: `Missing or default metadata values: ${missingFields.join(', ')}`,
        evidenceReference: `FDR Instrument record ${fdr.id}`,
        explanation: 'Complete banking metadata is necessary to facilitate renewal monitoring and statutory lien enforcement.',
        recommendedAction: 'Request institution administrator update instrument metadata with accurate branch details.',
        resolved: false
      });
    }

    // 9. Institution Regulatory Standing
    if (fdr.institution_status === 'UNDER_SCRUTINY') {
      const instPoints = 15;
      currentScore += instPoints;
      factors.push({
        name: 'Institution Under Scrutiny Protocol',
        points: instPoints,
        category: 'REGULATORY',
        evidence: `Parent institution (${fdr.institution_name} [${fdr.institution_code}]) is currently marked UNDER_SCRUTINY`,
        evidenceReference: `Institution profile ${fdr.institution_id}`,
        explanation: 'Instruments originating from institutions under regulatory scrutiny undergo enhanced due diligence.',
        recommendedAction: 'Check regulatory scrutiny remarks before issuing approvals or release permissions.',
        resolved: false
      });
    }

    // 10. Overdue Maturity State
    const now = new Date();
    const maturityDate = new Date(fdr.maturity_date);
    if (maturityDate < now && fdr.renewal_status !== 'REPLACEMENT_ACCEPTED' && fdr.current_status !== 'RELEASED') {
      const overdueDays = Math.floor((now.getTime() - maturityDate.getTime()) / (1000 * 3600 * 24));
      const overduePoints = weights.RISK_WEIGHT_OVERDUE_RENEWAL;
      currentScore += overduePoints;
      factors.push({
        name: 'Overdue Instrument Maturity',
        points: overduePoints,
        category: 'OVERDUE',
        evidence: `Instrument matured ${overdueDays} day(s) ago without accepted renewal replacement or authorized release`,
        evidenceReference: `Maturity date ${fdr.maturity_date}`,
        explanation: 'Expired instruments jeopardize institutional security deposit adequacy. Immediate renewal or forfeiture protocol applies.',
        recommendedAction: 'Issue formal notice requiring institution to submit replacement FDR within 15 statutory business days.',
        resolved: false
      });
    }

    // Baseline factor if clean
    if (factors.length === 0) {
      factors.push({
        name: 'Standard Compliant Instrument',
        points: 0,
        category: 'BASELINE',
        evidence: 'All required parameters verified, no discrepancies detected, timely validity',
        evidenceReference: `FDR record ${fdr.id}`,
        explanation: 'All core checks passed with full documentation and no duplicate or alteration signals.',
        recommendedAction: 'Proceed with standard regulation officer sign-off.',
        resolved: true
      });
    }

    // Clamp score to 0-100
    const totalScore = Math.min(100, Math.max(0, currentScore));

    // Determine Risk Category & Review Priority
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let reviewPriorityLabel: RiskScoreResult['reviewPriorityLabel'] = 'Routine Monitoring';

    if (totalScore >= 75) {
      riskLevel = 'CRITICAL';
      reviewPriorityLabel = 'Immediate Action Required';
    } else if (totalScore >= 50) {
      riskLevel = 'HIGH';
      reviewPriorityLabel = 'Priority Scrutiny';
    } else if (totalScore >= 25) {
      riskLevel = 'MEDIUM';
      reviewPriorityLabel = 'Standard Review';
    }

    // Compile recommended next actions from active factors
    const recommendedNextActions = Array.from(
      new Set(factors.filter(f => !f.resolved && f.recommendedAction).map(f => f.recommendedAction))
    );
    if (recommendedNextActions.length === 0) {
      recommendedNextActions.push('No corrective action required. Maintain scheduled routine compliance monitoring.');
    }

    const nowIso = new Date().toISOString();
    const scoreDisclaimer =
      'Review-priority indicator for administrative scheduling; not a legal determination or proof of fraud.';

    // Persist to risk_assessments table
    const existing = await queryOne<any>(
      `SELECT id FROM risk_assessments WHERE fdr_id = ?`,
      [fdrId]
    );

    if (existing) {
      await run(
        `UPDATE risk_assessments
         SET total_score = ?, risk_level = ?, factors = ?, calculated_at = ?
         WHERE id = ?`,
        [totalScore, riskLevel, JSON.stringify(factors), nowIso, existing.id]
      );
    } else {
      const id = `risk-${uuidv4()}`;
      await run(
        `INSERT INTO risk_assessments (id, fdr_id, total_score, risk_level, factors, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, fdrId, totalScore, riskLevel, JSON.stringify(factors), nowIso]
      );
    }

    // Record Decision Evidence Trace
    const evidenceSummary = `Composite Review Priority Score: ${totalScore}/100 (${riskLevel}). Identified ${factors.length} factor(s). Priority Level: ${reviewPriorityLabel}.`;
    const evidencePayload = JSON.stringify({
      totalScore,
      riskLevel,
      reviewPriorityLabel,
      factorsCount: factors.length,
      factors: factors.map(f => ({ name: f.name, points: f.points, evidence: f.evidence })),
      recommendedNextActions
    });

    const existingEv = await queryOne<any>(
      `SELECT id FROM decision_evidence WHERE fdr_id = ? AND decision_type = 'RISK_SCORING'`,
      [fdrId]
    );

    if (existingEv) {
      await run(
        `UPDATE decision_evidence
         SET findings_summary = ?, evidence_payload = ?, outcome = ?, created_at = ?
         WHERE id = ?`,
        [evidenceSummary, evidencePayload, riskLevel, nowIso, existingEv.id]
      );
    } else {
      await run(
        `INSERT INTO decision_evidence (
          id, fdr_id, decision_type, responsible_entity, findings_summary, evidence_payload, outcome, created_at
        ) VALUES (?, ?, 'RISK_SCORING', 'AUTOMATED_RISK_ENGINE', ?, ?, ?, ?)`,
        [`ev-${uuidv4()}`, fdrId, evidenceSummary, evidencePayload, riskLevel, nowIso]
      );
    }

    // Update main fdr record
    await run(
      `UPDATE fdr_instruments
       SET risk_score = ?, risk_level = ?, updated_at = ?
       WHERE id = ?`,
      [totalScore, riskLevel, nowIso, fdrId]
    );

    return {
      totalScore,
      riskLevel,
      reviewPriorityLabel,
      scoreDisclaimer,
      factors,
      recommendedNextActions,
      calculatedAt: nowIso
    };
  }
}

export const riskScoringService = new RiskScoringService();
