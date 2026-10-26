import { queryOne, query } from '../db/database.js';

export interface ReadinessChecklistItem {
  key: string;
  label: string;
  completed: boolean;
  responsibleRole: string;
  statusText: string;
  details: string;
}

export interface RenewalReadinessResult {
  fdrId: string;
  readinessStatus: 'READY' | 'AT_RISK' | 'NOT_READY' | 'INSUFFICIENT_DATA';
  estimatedStageDurationDays: number;
  daysRemaining: number;
  checklist: ReadinessChecklistItem[];
  recommendedActions: string[];
  explanation: string;
}

export class ReadinessService {
  async evaluateRenewalReadiness(fdrId: string): Promise<RenewalReadinessResult> {
    const fdr = await queryOne<any>(
      `SELECT f.*, i.name as institution_name
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       WHERE f.id = ?`,
      [fdrId]
    );

    if (!fdr) {
      throw new Error(`FDR ${fdrId} not found`);
    }

    const now = new Date();
    const maturity = new Date(fdr.maturity_date);
    const daysRemaining = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 3600 * 24));

    // Check replacement FDR instrument
    const replacement = await queryOne<any>(
      `SELECT * FROM fdr_instruments WHERE replacement_for_fdr_id = ?`,
      [fdrId]
    );

    // Check documents for replacement or original
    const targetFdrId = replacement ? replacement.id : fdr.id;
    const docs = await query<any>(
      `SELECT * FROM documents WHERE fdr_id = ? AND status != 'REJECTED'`,
      [targetFdrId]
    );

    // Check extraction
    const extraction = await queryOne<any>(
      `SELECT * FROM document_extractions WHERE fdr_id = ?`,
      [targetFdrId]
    );

    // Check discrepancies
    const openDiscrepancies = await query<any>(
      `SELECT * FROM verification_records
       WHERE fdr_id = ? AND status IN ('FAIL', 'WARNING') AND resolution_status = 'UNRESOLVED'`,
      [targetFdrId]
    );

    // Check renewal request record
    const renewalReq = await queryOne<any>(
      `SELECT * FROM renewal_requests WHERE original_fdr_id = ?`,
      [fdrId]
    );

    const checklist: ReadinessChecklistItem[] = [
      {
        key: 'REPLACEMENT_SUBMITTED',
        label: 'Replacement Instrument Submitted',
        completed: Boolean(replacement),
        responsibleRole: 'INSTITUTION_ADMIN',
        statusText: replacement ? `Replacement FDR registered (${replacement.fdr_number})` : 'Awaiting replacement FDR submission by institution',
        details: replacement ? `Amount: ₹${replacement.amount.toLocaleString('en-IN')}` : 'Institution has not yet uploaded renewed instrument'
      },
      {
        key: 'DOCUMENTS_AVAILABLE',
        label: 'Signed Bank Certificate Uploaded',
        completed: docs.length > 0,
        responsibleRole: 'INSTITUTION_ADMIN',
        statusText: docs.length > 0 ? `${docs.length} document(s) uploaded and available` : 'Missing bank FDR certificate scan',
        details: docs.length > 0 ? docs.map(d => d.original_filename).join(', ') : 'Upload scanned PDF in Document Management'
      },
      {
        key: 'EXTRACTION_COMPLETED',
        label: 'Document Text & Field Extraction',
        completed: Boolean(extraction),
        responsibleRole: 'SYSTEM_AUTOMATION',
        statusText: extraction ? `Extraction complete (Confidence: ${Math.round(extraction.confidence_score * 100)}%)` : 'Extraction not yet processed',
        details: extraction ? `Parsed ${extraction.extracted_bank_name || 'Bank'} certificate` : 'Pending OCR / text parse execution'
      },
      {
        key: 'VERIFICATION_PASSED',
        label: 'Bank & Field Scrutiny Clearance',
        completed: replacement ? replacement.verification_status === 'DEMO_VERIFIED' : fdr.verification_status === 'DEMO_VERIFIED',
        responsibleRole: 'REGULATION_OFFICER',
        statusText: (replacement ? replacement.verification_status : fdr.verification_status) === 'DEMO_VERIFIED' ? 'Verified against bank ledger' : 'Bank verification pending or mismatched',
        details: 'Simulated interbank confirmation required'
      },
      {
        key: 'NO_DISCREPANCIES',
        label: 'Zero Unresolved Alteration Indicators',
        completed: openDiscrepancies.length === 0,
        responsibleRole: 'REGULATION_OFFICER',
        statusText: openDiscrepancies.length === 0 ? 'No open discrepancies on record' : `${openDiscrepancies.length} discrepancy observation(s) active`,
        details: openDiscrepancies.length === 0 ? 'Clear compliance record' : 'Officer resolution or institution justification required'
      },
      {
        key: 'OFFICER_DECISION',
        label: 'Regulation Officer Acceptance',
        completed: renewalReq ? renewalReq.status === 'ACCEPTED' : fdr.renewal_status === 'REPLACEMENT_ACCEPTED',
        responsibleRole: 'REGULATION_OFFICER',
        statusText: (renewalReq?.status === 'ACCEPTED' || fdr.renewal_status === 'REPLACEMENT_ACCEPTED') ? 'Accepted by assigned scrutiny officer' : 'Pending final scrutiny determination',
        details: 'Officer review in Officer Workbench'
      }
    ];

    const completedCount = checklist.filter(c => c.completed).length;
    let estimatedDays = (checklist.length - completedCount) * 2; // ~2 days per remaining stage

    let readinessStatus: RenewalReadinessResult['readinessStatus'] = 'NOT_READY';
    const recommendedActions: string[] = [];

    if (!replacement) {
      readinessStatus = daysRemaining < 10 ? 'NOT_READY' : 'INSUFFICIENT_DATA';
      recommendedActions.push('Institution Administrator must upload renewed fixed deposit receipt before expiry.');
    } else if (openDiscrepancies.length > 0) {
      readinessStatus = 'AT_RISK';
      recommendedActions.push('Regulation Officer must scrutinize flagged discrepancies between certificate and digital form.');
    } else if (completedCount >= 5) {
      readinessStatus = 'READY';
      recommendedActions.push('All prerequisites satisfied. Officer can record final replacement endorsement.');
    } else if (daysRemaining < estimatedDays) {
      readinessStatus = 'AT_RISK';
      recommendedActions.push(`Time buffer deficient: Remaining processing estimated at ${estimatedDays} days, but only ${daysRemaining} day(s) remain before maturity.`);
    } else {
      readinessStatus = 'READY';
      recommendedActions.push('Progressing on schedule. Complete remaining verification checks.');
    }

    return {
      fdrId,
      readinessStatus,
      estimatedStageDurationDays: estimatedDays,
      daysRemaining,
      checklist,
      recommendedActions,
      explanation: `Deterministic readiness assessment: ${completedCount}/${checklist.length} workflow gates fulfilled. Estimated time to finalization: ${estimatedDays} business day(s).`
    };
  }
}

export const readinessService = new ReadinessService();
