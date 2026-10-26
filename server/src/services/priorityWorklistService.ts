import { query, queryOne, run } from '../db/database.js';

export interface WorklistItem {
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  bankName: string;
  branchName: string;
  amount: number;
  maturityDate: string;
  daysToMaturity: number;
  currentStatus: string;
  verificationStatus: string;
  riskScore: number;
  riskLevel: string;
  assignedOfficerId: string | null;
  assignedOfficerName: string | null;
  priorityLabel: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'LOW';
  priorityScore: number;
  dueDate: string;
  pendingCaseAgeDays: number;
  unresolvedDiscrepanciesCount: number;
  openDuplicatesCount: number;
  rankingReasons: string[];
  recommendedActions: string[];
  workflowType: 'SUBMISSION_REVIEW' | 'DUPLICATE_SCRUTINY' | 'MATURITY_ACTION' | 'RENEWAL_DECISION' | 'RELEASE_DECISION' | 'ROUTINE';
}

export class PriorityWorklistService {
  async getOfficerWorklist(officerId?: string, filter?: string): Promise<WorklistItem[]> {
    const now = new Date();

    const sql = `
      SELECT f.*, i.name as institution_name, i.code as institution_code, u.name as officer_name,
             (SELECT COUNT(*) FROM duplicate_findings df WHERE df.fdr_id = f.id AND df.status = 'OPEN') as open_duplicates_count,
             (SELECT COUNT(*) FROM verification_records vr WHERE vr.fdr_id = f.id AND vr.resolution_status = 'UNRESOLVED') as unresolved_discrepancies_count,
             (SELECT COUNT(*) FROM renewal_requests rr WHERE rr.original_fdr_id = f.id AND rr.status = 'PENDING_REVIEW') as pending_renewals_count,
             (SELECT COUNT(*) FROM release_requests rel WHERE rel.fdr_id = f.id AND rel.status IN ('SUBMITTED', 'UNDER_REVIEW', 'AWAITING_COMPETENT_AUTHORITY')) as pending_releases_count
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      LEFT JOIN users u ON f.assigned_officer_id = u.id
      WHERE f.is_archived = 0
    `;

    const records = await query<any>(sql);
    const worklist: WorklistItem[] = [];

    for (const r of records) {
      const maturity = new Date(r.maturity_date);
      const daysToMaturity = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const isMatured = daysToMaturity < 0;
      const overdueDays = isMatured ? Math.abs(daysToMaturity) : 0;

      const createdDate = new Date(r.created_at || now);
      const pendingCaseAgeDays = Math.max(0, Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)));

      let score = 0;
      const rankingReasons: string[] = [];
      const recommendedActions: string[] = [];
      let workflowType: WorklistItem['workflowType'] = 'ROUTINE';

      // 1. Duplicate Collision Check
      if (r.open_duplicates_count > 0) {
        score += 35;
        rankingReasons.push(`Cross-Institution Alert: ${r.open_duplicates_count} active duplicate finding(s) pending resolution`);
        recommendedActions.push('Scrutinize duplicate candidate comparison and review physical branch letters');
        workflowType = 'DUPLICATE_SCRUTINY';
      }

      // 2. Pending Release Request
      if (r.pending_releases_count > 0) {
        score += 28;
        rankingReasons.push('Active release / refund requisition submitted; awaiting regulatory decision');
        recommendedActions.push('Verify clearance of all regulatory obligations and authorize two-tier release order');
        workflowType = 'RELEASE_DECISION';
      }

      // 3. Pending Renewal Replacement Review
      if (r.pending_renewals_count > 0 || r.renewal_status === 'REPLACEMENT_SUBMITTED') {
        score += 25;
        rankingReasons.push('Renewal replacement FDR uploaded by institution; scrutiny required');
        recommendedActions.push('Evaluate replacement instrument parameters and approve validity continuity');
        workflowType = 'RENEWAL_DECISION';
      }

      // 4. Maturity Urgency
      if (isMatured) {
        score += 40 + Math.min(25, overdueDays);
        rankingReasons.push(`Maturity Overdue: Instrument expired ${overdueDays} day(s) ago without approved renewal or release`);
        recommendedActions.push('Issue formal 15-day replacement demand notice to institution administrator');
        workflowType = 'MATURITY_ACTION';
      } else if (daysToMaturity <= 7) {
        score += 30;
        rankingReasons.push(`Imminent Maturity: Expires in ${daysToMaturity} day(s)`);
        recommendedActions.push('Send automated or manual maturity notification requesting replacement deposit');
      } else if (daysToMaturity <= 30) {
        score += 18;
        rankingReasons.push(`Upcoming Maturity Window: Expires within 30 days (${daysToMaturity} days remaining)`);
        recommendedActions.push('Monitor replacement progress and confirm bank lien status');
      } else if (daysToMaturity <= 60) {
        score += 8;
        rankingReasons.push(`Scheduled Maturity Window: ${daysToMaturity} days remaining`);
      }

      // 5. Unresolved Discrepancies
      if (r.unresolved_discrepancies_count > 0) {
        score += Math.min(30, r.unresolved_discrepancies_count * 15);
        rankingReasons.push(`${r.unresolved_discrepancies_count} unresolved verification discrepancy observation(s) on file`);
        recommendedActions.push('Examine discrepancy observation in Scrutiny Workbench and record official finding');
      }

      // 6. Evidence-linked Risk Score Contribution
      if (r.risk_score >= 75) {
        score += 25;
        rankingReasons.push(`Critical review priority score: ${r.risk_score}/100`);
      } else if (r.risk_score >= 50) {
        score += 15;
        rankingReasons.push(`Elevated review priority score: ${r.risk_score}/100`);
      }

      // 7. Case Backlog Aging
      if ((r.current_status === 'SUBMITTED' || r.current_status === 'PENDING_VERIFICATION') && pendingCaseAgeDays >= 5) {
        const agePoints = Math.min(20, Math.floor(pendingCaseAgeDays / 3) * 5);
        score += agePoints;
        rankingReasons.push(`Aging Backlog: Case has been pending initial review for ${pendingCaseAgeDays} day(s)`);
        recommendedActions.push('Conduct initial document extraction review and verify mandatory certificate');
        if (workflowType === 'ROUTINE') workflowType = 'SUBMISSION_REVIEW';
      }

      // Fallback default action
      if (recommendedActions.length === 0) {
        recommendedActions.push('Perform routine periodic compliance audit; no active impediments');
      }

      // Calculate Target Due Date
      const targetDueDate = new Date();
      if (isMatured) {
        // Overdue today
        targetDueDate.setDate(now.getDate());
      } else if (daysToMaturity <= 7) {
        targetDueDate.setDate(maturity.getDate());
      } else if (score >= 60) {
        targetDueDate.setDate(now.getDate() + 2); // 48 hours for critical/urgent
      } else if (score >= 35) {
        targetDueDate.setDate(now.getDate() + 5);
      } else {
        targetDueDate.setDate(now.getDate() + 14);
      }
      const dueDate = targetDueDate.toISOString().split('T')[0];

      // Determine Priority Label
      let priorityLabel: WorklistItem['priorityLabel'] = 'LOW';
      if (score >= 60) {
        priorityLabel = 'CRITICAL';
      } else if (score >= 35) {
        priorityLabel = 'URGENT';
      } else if (score >= 18) {
        priorityLabel = 'NORMAL';
      }

      if (rankingReasons.length === 0) {
        rankingReasons.push('Routine compliance monitoring; instrument in good standing');
      }

      worklist.push({
        fdrId: r.id,
        fdrNumber: r.fdr_number,
        institutionId: r.institution_id,
        institutionName: r.institution_name,
        institutionCode: r.institution_code,
        bankName: r.bank_name,
        branchName: r.branch_name,
        amount: r.amount,
        maturityDate: r.maturity_date,
        daysToMaturity,
        currentStatus: r.current_status,
        verificationStatus: r.verification_status,
        riskScore: r.risk_score,
        riskLevel: r.risk_level,
        assignedOfficerId: r.assigned_officer_id,
        assignedOfficerName: r.officer_name,
        priorityLabel,
        priorityScore: score,
        dueDate,
        pendingCaseAgeDays,
        unresolvedDiscrepanciesCount: r.unresolved_discrepancies_count || 0,
        openDuplicatesCount: r.open_duplicates_count || 0,
        rankingReasons,
        recommendedActions,
        workflowType
      });
    }

    // Sort descending by priorityScore, then earliest maturity
    worklist.sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      return a.daysToMaturity - b.daysToMaturity;
    });

    // Apply Filter if requested
    if (filter === 'assigned_to_me' && officerId) {
      return worklist.filter(w => w.assignedOfficerId === officerId);
    }
    if (filter === 'unassigned') {
      return worklist.filter(w => !w.assignedOfficerId);
    }
    if (filter === 'high_risk') {
      return worklist.filter(w => w.riskScore >= 50);
    }
    if (filter === 'maturing_soon') {
      return worklist.filter(w => w.daysToMaturity >= 0 && w.daysToMaturity <= 30);
    }
    if (filter === 'overdue') {
      return worklist.filter(w => w.daysToMaturity < 0);
    }
    if (filter === 'duplicate_suspected') {
      return worklist.filter(w => w.openDuplicatesCount > 0);
    }
    if (filter === 'pending_release') {
      return worklist.filter(w => w.workflowType === 'RELEASE_DECISION');
    }

    return worklist;
  }
}

export const priorityWorklistService = new PriorityWorklistService();
