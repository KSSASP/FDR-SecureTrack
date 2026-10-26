-- FDR SecureTrack Database Schema

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, UNDER_SCRUTINY, SUSPENDED
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- SUPER_ADMIN, REGULATION_OFFICER, INSTITUTION_ADMIN
  institution_id TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS fdr_instruments (
  id TEXT PRIMARY KEY,
  fdr_number TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  ifsc_code TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  deposit_type TEXT NOT NULL DEFAULT 'SECURITY_DEPOSIT', -- SECURITY_DEPOSIT, PERFORMANCE_GUARANTEE, ENDOWMENT_FUND
  linked_application_ref TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  maturity_date TEXT NOT NULL,
  interest_rate REAL,
  current_status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, PENDING_VERIFICATION, VERIFIED, DEFICIENT, REPLACED, MATURED, RELEASE_REQUESTED, RELEASED, REJECTED, ARCHIVED
  verification_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, DEMO_VERIFIED, DEMO_MISMATCH, NOT_CONNECTED, REJECTED
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
  assigned_officer_id TEXT,
  replacement_for_fdr_id TEXT,
  renewal_status TEXT NOT NULL DEFAULT 'NONE', -- NONE, RENEWAL_REQUESTED, REPLACEMENT_SUBMITTED, REPLACEMENT_PENDING_REVIEW, REPLACEMENT_ACCEPTED, REPLACEMENT_REJECTED
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (assigned_officer_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'FDR_CERTIFICATE', -- FDR_CERTIFICATE, BANK_CONFIRMATION, REPLACEMENT_FDR, RELEASE_APPLICATION, COMPLIANCE_AFFIDAVIT
  document_hash TEXT NOT NULL, -- SHA-256 for duplicate and tampering detection
  status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED, PROCESSING, EXTRACTED, NEEDS_REVIEW, ACCEPTED, REJECTED
  version INTEGER NOT NULL DEFAULT 1,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  fdr_id TEXT,
  extracted_fdr_number TEXT,
  extracted_bank_name TEXT,
  extracted_branch TEXT,
  extracted_amount REAL,
  extracted_issue_date TEXT,
  extracted_maturity_date TEXT,
  extracted_interest_rate REAL,
  extracted_institution_name TEXT,
  raw_text TEXT,
  extraction_method TEXT NOT NULL DEFAULT 'PDF_TEXT', -- PDF_TEXT, OCR_FALLBACK, MANUAL_ENTRY
  confidence_score REAL NOT NULL DEFAULT 0.0,
  tampering_indicators TEXT, -- JSON array of detected indicators
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS verification_records (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  stage TEXT NOT NULL, -- FIELD_VALIDATION, DUPLICATE_CHECK, BANK_SIMULATION, OFFICER_REVIEW
  source TEXT NOT NULL, -- INTERNAL_VALIDATOR, CROSS_CHECK_ENGINE, SIMULATED_BANK_API, OFFICER
  status TEXT NOT NULL, -- PASS, FAIL, WARNING, DEMO_VERIFIED, DEMO_MISMATCH, NOT_CONNECTED
  details TEXT, -- JSON details
  discrepancies TEXT, -- JSON array
  officer_observation TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'UNRESOLVED', -- UNRESOLVED, RESOLVED, EXCEPTION_APPROVED
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS duplicate_findings (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  matched_fdr_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  matched_institution_id TEXT NOT NULL,
  match_category TEXT NOT NULL, -- EXACT_DUPLICATE, STRONG_POTENTIAL_MATCH, WEAK_SIMILARITY, NO_MATCH
  similarity_score REAL NOT NULL DEFAULT 0.0,
  matching_signals TEXT NOT NULL, -- JSON array of matched signals
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, REVIEWED_LEGITIMATE, CONFIRMED_DUPLICATE, DISMISSED
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (matched_fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
  factors TEXT NOT NULL, -- JSON array of factors
  calculated_at TEXT NOT NULL,
  overridden_by TEXT,
  override_reason TEXT,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (overridden_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS renewal_requests (
  id TEXT PRIMARY KEY,
  original_fdr_id TEXT NOT NULL,
  replacement_fdr_id TEXT,
  institution_id TEXT NOT NULL,
  request_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  readiness_status TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA', -- READY, AT_RISK, NOT_READY, INSUFFICIENT_DATA
  readiness_details TEXT, -- JSON checklist
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW, ACCEPTED, REJECTED, CORRECTION_REQUIRED
  officer_comments TEXT,
  decision_date TEXT,
  decided_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (original_fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (replacement_fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (decided_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS release_requests (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  request_type TEXT NOT NULL, -- FULL_RELEASE, PARTIAL_REFUND, REGULATORY_COMPLETION, COURT_ORDER
  reason TEXT NOT NULL,
  submission_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, UNDER_REVIEW, ADDITIONAL_INFO_REQUIRED, RECOMMENDED, AWAITING_COMPETENT_AUTHORITY, AUTHORIZED, REJECTED, CLOSED
  eligibility_checklist TEXT, -- JSON checklist
  officer_observations TEXT,
  decision_comments TEXT,
  first_authorized_by TEXT,
  first_authorized_at TEXT,
  second_authorized_by TEXT,
  second_authorized_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (first_authorized_by) REFERENCES users(id),
  FOREIGN KEY (second_authorized_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  fdr_id TEXT,
  institution_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL', -- LOW, NORMAL, URGENT, CRITICAL
  target_role TEXT NOT NULL, -- SUPER_ADMIN, REGULATION_OFFICER, INSTITUTION_ADMIN
  target_user_id TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_escalated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS decision_evidence (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  decision_type TEXT NOT NULL, -- RISK_SCORING, DUPLICATE_CHECK, VERIFICATION_SCRUTINY, RENEWAL_DECISION, RELEASE_DECISION, OFFICER_OVERRIDE
  responsible_entity TEXT NOT NULL,
  supporting_document_ids TEXT, -- JSON array
  findings_summary TEXT NOT NULL,
  evidence_payload TEXT NOT NULL, -- JSON
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (fdr_id) REFERENCES fdr_instruments(id)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  institution_id TEXT,
  before_state TEXT, -- JSON
  after_state TEXT, -- JSON
  decision_reason TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_fdr_institution ON fdr_instruments(institution_id);
CREATE INDEX IF NOT EXISTS idx_fdr_status ON fdr_instruments(current_status);
CREATE INDEX IF NOT EXISTS idx_fdr_maturity ON fdr_instruments(maturity_date);
CREATE INDEX IF NOT EXISTS idx_fdr_number ON fdr_instruments(fdr_number);
CREATE INDEX IF NOT EXISTS idx_docs_fdr ON documents(fdr_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(target_user_id, is_read);
