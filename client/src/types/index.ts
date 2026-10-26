export type Role = 'SUPER_ADMIN' | 'REGULATION_OFFICER' | 'INSTITUTION_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  institution_id: string | null;
  institution_name?: string | null;
  institution_code?: string | null;
  phone?: string | null;
}

export interface Institution {
  id: string;
  code: string;
  name: string;
  registration_number: string;
  state: string;
  city: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  status: 'ACTIVE' | 'UNDER_SCRUTINY' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export interface FDRInstrument {
  id: string;
  fdr_number: string;
  institution_id: string;
  institution_name?: string;
  institution_code?: string;
  bank_name: string;
  branch_name: string;
  ifsc_code?: string | null;
  amount: number;
  currency: string;
  deposit_type: string;
  linked_application_ref: string;
  issue_date: string;
  maturity_date: string;
  interest_rate?: number | null;
  current_status: 'SUBMITTED' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'DEFICIENT' | 'REPLACED' | 'MATURED' | 'RELEASE_REQUESTED' | 'RELEASED' | 'REJECTED' | 'ARCHIVED';
  verification_status: 'PENDING' | 'DEMO_VERIFIED' | 'DEMO_MISMATCH' | 'NOT_CONNECTED' | 'REJECTED';
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_officer_id?: string | null;
  assigned_officer_name?: string | null;
  replacement_for_fdr_id?: string | null;
  renewal_status: 'NONE' | 'RENEWAL_REQUESTED' | 'REPLACEMENT_SUBMITTED' | 'REPLACEMENT_PENDING_REVIEW' | 'REPLACEMENT_ACCEPTED' | 'REPLACEMENT_REJECTED';
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  fdr_id: string;
  institution_id: string;
  original_filename: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  document_hash: string;
  status: 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'NEEDS_REVIEW' | 'ACCEPTED' | 'REJECTED';
  version: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  fdr_id: string;
  extracted_fdr_number?: string | null;
  extracted_bank_name?: string | null;
  extracted_branch?: string | null;
  extracted_amount?: number | null;
  extracted_issue_date?: string | null;
  extracted_maturity_date?: string | null;
  extracted_interest_rate?: number | null;
  extracted_institution_name?: string | null;
  raw_text?: string | null;
  extraction_method: 'PDF_TEXT' | 'OCR_FALLBACK' | 'MANUAL_ENTRY';
  confidence_score: number;
  tampering_indicators?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

export interface VerificationRecord {
  id: string;
  fdr_id: string;
  stage: 'FIELD_VALIDATION' | 'DUPLICATE_CHECK' | 'BANK_SIMULATION' | 'OFFICER_REVIEW';
  source: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'DEMO_VERIFIED' | 'DEMO_MISMATCH' | 'NOT_CONNECTED';
  details?: string | null;
  discrepancies?: string | null;
  officer_observation?: string | null;
  resolution_status: 'UNRESOLVED' | 'RESOLVED' | 'EXCEPTION_APPROVED';
  resolved_by?: string | null;
  resolved_by_name?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface DuplicateFinding {
  id: string;
  fdr_id: string;
  matched_fdr_id: string;
  institution_id: string;
  matched_institution_id: string;
  fdr_number?: string;
  bank_name?: string;
  amount?: number;
  maturity_date?: string;
  institution_name?: string;
  matched_fdr_number?: string;
  matched_bank_name?: string;
  matched_amount?: number;
  matched_maturity_date?: string;
  matched_institution_name?: string;
  match_category: 'EXACT_DUPLICATE' | 'STRONG_POTENTIAL_MATCH' | 'WEAK_SIMILARITY' | 'NO_MATCH';
  similarity_score: number;
  matching_signals: string;
  reason: string;
  status: 'OPEN' | 'REVIEWED_LEGITIMATE' | 'CONFIRMED_DUPLICATE' | 'DISMISSED';
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface RiskFactor {
  name: string;
  points: number;
  category: string;
  evidence: string;
  evidenceReference?: string;
  explanation?: string;
  recommendedAction?: string;
  resolved: boolean;
}

export interface RiskAssessment {
  id: string;
  fdr_id: string;
  total_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewPriorityLabel?: string;
  scoreDisclaimer?: string;
  recommendedNextActions?: string[];
  factors: string | RiskFactor[];
  calculated_at: string;
  overridden_by?: string | null;
  overridden_by_name?: string | null;
  override_reason?: string | null;
}

export interface RenewalRequest {
  id: string;
  original_fdr_id: string;
  replacement_fdr_id?: string | null;
  institution_id: string;
  institution_name?: string;
  original_fdr_number?: string;
  original_amount?: number;
  original_bank?: string;
  original_maturity?: string;
  replacement_fdr_number?: string;
  replacement_amount?: number;
  replacement_bank?: string;
  replacement_maturity?: string;
  request_date: string;
  reason: string;
  readiness_status: 'READY' | 'AT_RISK' | 'NOT_READY' | 'INSUFFICIENT_DATA';
  readiness_details?: string | null;
  status: 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'CORRECTION_REQUIRED';
  officer_comments?: string | null;
  decision_date?: string | null;
  decided_by?: string | null;
  decided_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseRequest {
  id: string;
  fdr_id: string;
  fdr_number?: string;
  bank_name?: string;
  amount?: number;
  maturity_date?: string;
  linked_application_ref?: string;
  institution_id: string;
  institution_name?: string;
  request_type: string;
  reason: string;
  submission_date: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ADDITIONAL_INFO_REQUIRED' | 'RECOMMENDED' | 'AWAITING_COMPETENT_AUTHORITY' | 'AUTHORIZED' | 'REJECTED' | 'CLOSED';
  eligibility_checklist?: string | null;
  officer_observations?: string | null;
  decision_comments?: string | null;
  first_authorized_by?: string | null;
  first_authorizer_name?: string | null;
  first_authorized_at?: string | null;
  second_authorized_by?: string | null;
  second_authorizer_name?: string | null;
  second_authorized_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  event_type: string;
  fdr_id?: string | null;
  institution_id?: string | null;
  title: string;
  message: string;
  priority: 'LOW' | 'NORMAL' | 'URGENT' | 'CRITICAL';
  target_role: string;
  target_user_id?: string | null;
  is_read: number;
  is_escalated: number;
  created_at: string;
}

export interface DecisionEvidence {
  id: string;
  fdr_id: string;
  decision_type: string;
  responsible_entity: string;
  supporting_document_ids?: string;
  findings_summary: string;
  evidence_payload: string;
  outcome: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  institution_id?: string | null;
  before_state?: string | null;
  after_state?: string | null;
  decision_reason?: string | null;
  ip_address?: string;
  created_at: string;
}

export interface WorklistItem {
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  institutionCode?: string;
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
  dueDate?: string;
  pendingCaseAgeDays?: number;
  unresolvedDiscrepanciesCount?: number;
  openDuplicatesCount?: number;
  rankingReasons: string[];
  recommendedActions?: string[];
  workflowType: string;
}
