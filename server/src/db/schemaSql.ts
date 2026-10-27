export const SCHEMA_SQL = `
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
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
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
  deposit_type TEXT NOT NULL DEFAULT 'SECURITY_DEPOSIT',
  linked_application_ref TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  maturity_date TEXT NOT NULL,
  interest_rate REAL,
  current_status TEXT NOT NULL DEFAULT 'SUBMITTED',
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  assigned_officer_id TEXT,
  replacement_for_fdr_id TEXT,
  renewal_status TEXT NOT NULL DEFAULT 'NONE',
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
  document_type TEXT NOT NULL DEFAULT 'FDR_CERTIFICATE',
  document_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
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
  extraction_method TEXT NOT NULL DEFAULT 'PDF_TEXT',
  confidence_score REAL NOT NULL DEFAULT 0.0,
  tampering_indicators TEXT,
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS verification_records (
  id TEXT PRIMARY KEY,
  fdr_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  discrepancies TEXT,
  officer_observation TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
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
  match_category TEXT NOT NULL,
  similarity_score REAL NOT NULL DEFAULT 0.0,
  matching_signals TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
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
  risk_level TEXT NOT NULL DEFAULT 'LOW',
  factors TEXT NOT NULL,
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
  readiness_status TEXT NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  readiness_details TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
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
  request_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  submission_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  eligibility_checklist TEXT,
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
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  target_role TEXT NOT NULL,
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
  decision_type TEXT NOT NULL,
  responsible_entity TEXT NOT NULL,
  supporting_document_ids TEXT,
  findings_summary TEXT NOT NULL,
  evidence_payload TEXT NOT NULL,
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
  before_state TEXT,
  after_state TEXT,
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
`;
