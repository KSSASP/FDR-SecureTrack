# FDR SecureTrack
### Intelligent Security Deposit and Fixed Deposit Receipt (FDR) Lifecycle Management Portal

---

## 1. Executive Summary

**FDR SecureTrack** is a centralized, secure regulatory compliance and financial instrument repository designed for government education administrations and regulatory councils. It automates and safeguards the complete lifecycle of institutional Security Deposits, Fixed Deposit Receipts (FDRs), and Bank Guarantees associated with regulatory approvals, institution registration, compliance monitoring, renewal/replacement, and refund authorizations.

### Key Lifecycle Workflow:
```
Institution Registration ──> FDR Submission ──> Automated Extraction ──> Multi-Stage Validation
                                                                                 │
                                                                                 ▼
Audit History <── Authorized Decision <── Release / Refund <── Renewal <── Risk Assessment & Scrutiny
```

---

## 2. Technology Stack

* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router v6, Recharts (Analytical Charts), Lucide React (Enterprise Icons).
* **Backend:** Node.js, Express.js REST API, TypeScript (`tsx` runtime execution).
* **Database:** SQLite with `sql.js` (pure WebAssembly engine with automatic cross-restart disk persistence and zero native C++ compiler dependencies).
* **Document Processing:** PDF text parsing via `pdf-parse`, regex and heuristic field parsers, scanned document OCR fallback simulation, SHA-256 cryptographic document fingerprinting.
* **Security & Access Control:** Bcrypt salted password hashing, stateless JSON Web Tokens (JWT), role-based access control (RBAC), and strict institution-level query isolation.
* **AI & Integrity Engine:** Google Gemini API integration (via official `@google/genai` SDK with strict RBAC database grounding, multi-turn dialogue, English/Tamil bilingual support), local deterministic tampering analysis, and explainable rule-based risk scoring.

---

## 3. User Roles & Seeded Demo Credentials

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@fdrsecuretrack.gov.in` | `Admin@12345` | Global oversight, user administration, system integrations, two-tier release authorization, risk weight configuration |
| **Regulation Officer 1** | `officer.sharma@fdrsecuretrack.gov.in` | `Officer@12345` | Scrutiny review, interbank verification execution, cross-institution duplicate review, priority worklist |
| **Regulation Officer 2** | `officer.raman@fdrsecuretrack.gov.in` | `Officer@12345` | South Zone scrutiny, discrepancy resolution, renewal recommendation |
| **Institution Admin 1** | `admin@apextech.edu.in` | `Inst@12345` | Apex Institute of Technology & Research (INST-AICTE-101) - Restricted strictly to own instruments |
| **Institution Admin 2** | `admin@nationaleng.edu.in` | `Inst@12345` | National Engineering College, Pune (INST-AICTE-102) - Isolated view |
| **Institution Admin 3** | `admin@bharatmgmt.edu.in` | `Inst@12345` | Bharat Institute of Management Studies (INST-AICTE-103) - Isolated view |

> **Security Note:** In production, development-only default credentials must be replaced and strong password policies enforced.

---

## 4. Implementation Overview: 10 Core Features

1. **Centralized FDR Repository (`/fdrs`):**
   * Relational storage of FDR instruments with institution metadata, amount, dates, interest rate, linked approval reference, and status.
   * Full-text search across FDR serials, issuing banks, application numbers, and institutions.
   * Multi-dimensional filtering by validity horizon (30, 60, 90 days, already matured), risk tier, bank, and regulatory status.
   * Soft archival preserving immutable audit logs.
   * Server-enforced institution-level data isolation.

2. **Digital Document Management (`/documents`):**
   * Multi-format document upload (PDF, PNG, JPG, JPEG) up to 15MB.
   * Storage in protected directories outside public static web roots.
   * SHA-256 binary hash fingerprinting for duplicate and alteration detection.
   * Permission-verified inline PDF preview and download streaming.
   * Versioning support preserving prior certificate versions upon replacement.

3. **Multi-Stage Verification Engine (`/verification`):**
   * **Stage 1 (Field Validation):** Validates mandatory fields, chronology (maturity must be strictly after issue date), and monetary figures.
   * **Stage 2 (Duplicate Check):** Automated cross-institution repository scan.
   * **Stage 3 (Simulated Interbank Gateway):** Adapter interface executing simulated core banking status checks (`DEMO_VERIFIED`, `DEMO_MISMATCH`, `NOT_CONNECTED`).
   * **Stage 4 (Officer Scrutiny):** Officer observation recording with mandatory justification.

4. **Automated Validity and Maturity Monitoring (`/maturity`):**
   * Evaluates instruments against the real current date.
   * Configurable reminder windows (90, 60, 30, 15, 7, and 1 day prior to expiry).
   * Scheduled refresh engine with alert deduplication (avoids recreating spam notifications on dashboard reloads).
   * Overdue escalation rules (e.g. 14+ days overdue escalates automatically to Super Admin).

5. **Renewal & Replacement Monitoring (`/renewals`):**
   * Institutional submission of renewal requests with linked replacement instruments.
   * Side-by-side comparison of maturing vs renewed instruments.
   * Relationship history preserved: `Original FDR -> Renewal Request -> Replacement FDR -> Officer Decision`.
   * Preserves historical financial records without destructive overwriting.

6. **Release & Refund Workflow (`/release-requests`):**
   * Permission-controlled application workflow: `Submitted -> Under Review -> Recommended / Additional Info Required -> Awaiting Competent Authority -> Authorized Decision Recorded -> Closed`.
   * Regulatory eligibility checklist validation (moratorium completed, audit clearance, no pending litigation).
   * Two-tier approval enforcement (Tier 1 Officer Scrutiny + Tier 2 Super Admin Authorization).
   * Administrative decision decrees (never executes direct financial money transfers).

7. **Automated Alerts and Escalation (`/notifications`):**
   * Event priorities: `LOW`, `NORMAL`, `URGENT`, `CRITICAL`.
   * Targeted recipient routing based on user role and assigned cases.
   * Read/unread state tracking with direct one-click navigation to case evidence.

8. **Dashboard & Compliance Reports (`/dashboard`, `/reports`):**
   * Dynamic aggregate metrics (total secured deposit volume, active compliant count, high-risk cases, pending renewals).
   * Interactive Recharts visualizations (status distribution, bank distribution, composite risk breakdown, institution volume).
   * One-click direct CSV report export generated from real relational database records.

9. **Append-Only Audit Trail (`/audit`):**
   * Immutable logging of all operations: actor name, role, IP address, entity ID, action, before/after JSON state diffs, and decision reasons.
   * Guaranteed tamper-evident history with ordinary user deletion blocked.

10. **Integration & Data Security (`/settings`):**
    * Subsystem integration status monitor (Interbank Switch, OCR Engine, Tampering AI, Storage Vault).
    * Zero client-side leakage of private API credentials or environment secrets.

---

## 5. Implementation Overview: Core Innovations

1. **Improved Cross-Institution Duplicate Detection (`/duplicates`):**
   * **Field Normalization:** Canonical bank alias mapping (e.g. SBI ➔ State Bank of India, PNB ➔ Punjab National Bank), alphanumeric serial stripping, branch location cleaning, and monetary tolerance comparison.
   * **Cryptographic SHA-256 Matching:** Detects exact identical binary PDF/image uploads across institutions.
   * **Explainable Multi-Signal Scoring:** Differentiates `EXACT_DUPLICATE` (direct identifier collision) from `STRONG_POTENTIAL_MATCH` (multi-signal overlap) and `WEAK_SIMILARITY` (isolated coincidental attributes).
   * **Neutrality & Due Process:** Never pre-judges matches as fraud; provides transparent matched vs differing field tables with actionable scrutiny recommendations.

2. **Evidence-Linked Risk Scoring Engine (`/risk-assessment`):**
   * Transparent 0–100 composite scoring model with configurable weights for unresolved discrepancies, duplicate collision flags, missing certificates, date inversions, amount mismatches, and overdue maturity.
   * Every factor exposes: point contribution (+pts), evidence observation, evidence reference link, plain-English rationale, and recommended next action.
   * **Dynamic Recalculation:** Re-computes automatically upon field correction, document confirmation, or duplicate resolution.
   * Clearly labeled as administrative review-priority indicators, not legal determinations or proof of fraud.

3. **Priority-Based Officer Workbench (`/workbench`):**
   * Deterministic priority ranking algorithm balancing risk score, maturity countdown, unresolved discrepancies, and pending case age.
   * Displays target due dates, case backlog age in days, bulleted priority reasons, and recommended action steps.
   * Quick action buttons for assigning cases, executing scrutiny decisions (Approve Verified, Request Correction, Mark Deficient), and formal escalation to Super Admin.

4. **Human Review & Field Correction Traceability:**
   * Officer field correction modal supporting corrections on amount, FDR number, bank, branch, IFSC, issue date, and maturity date.
   * Enforces mandatory regulatory justification (minimum 5 characters).
   * Appends immutable audit log entries recording previous value, corrected value, officer identity, timestamp, and justification.
   * Automatically resolves associated discrepancy findings and recalculates the instrument risk score.

5. **AI-Assisted Document Tampering Indicators:**
   * Automated cross-comparison between certificate text and digital form entries.
   * Detects numerical discrepancy inflation, date chronology inversions, and bank mismatch indicators.
   * Categorized labels: *No field mismatch detected*, *Field mismatch detected*, *Possible alteration indicator*, *Manual review required*.

6. **Tamil and English Voice-Enabled Case Assistant (`/assistant`):**
   * Natural Language Intent Parser supporting English and தமிழ் queries.
   * Web Speech API microphone speech-to-text + SpeechSynthesis text-to-speech.
   * Respects user role and institution isolation for every query.
   * Returns structured answers in queried language with clickable direct case links.

7. **Renewal Readiness Prediction:**
   * Rule-based readiness checklist: replacement submitted, certificate uploaded, extraction completed, bank verification passed, zero unresolved discrepancies, officer determination recorded.
   * Classifications: `READY`, `AT_RISK`, `NOT_READY`, `INSUFFICIENT_DATA` with estimated business days to completion.

8. **Evidence-Linked Decision Traceability:**
   * "Decision Evidence" panel linking every decision (risk score, duplicate flag, verification scrutiny, renewal acceptance, release order) to underlying documents and audit events.

---

## 6. Setup & Running Instructions

### Prerequisites
* Node.js v18+ (tested on Node.js v24)
* npm v9+

### Step 1: Install Dependencies
```bash
# Install root orchestration tools
npm install

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```
*(Or run the root convenience shortcut: `npm run install:all`)*

### Step 2: Initialize Database and Seed Synthetic Data
```bash
npm run seed
```
This initializes the relational schema in `server/data/fdr_securetrack.db` and seeds:
* 8 Synthetic Institutions
* 25 Synthetic FDR Instruments (active, expiring in 1/5/14/28 days, matured 10/35/60 days ago, renewal chains, release requests, and discrepancy scenarios)
* Multi-stage verification records, duplicate collisions, and explainable risk scores
* Relative dates calculated from the current day to ensure immediate demonstration readiness.

### Step 3: Run the Automated Verification Test Suite
```bash
npm test
```
Executes the comprehensive 33-scenario automated verification test suite verifying:
1. **Valid login succeeds; invalid login fails.**
2. **Each role has correct access permissions and boundaries.**
3. **One institution cannot retrieve another institution's private records (Multi-Tenant Data Isolation).**
4. **A valid FDR can be created and remains stored after restart (Persistence).**
5. **Invalid amounts and inconsistent dates are rejected.**
6. **Authorized user can upload and retrieve permitted documents.**
7. **Extraction displays actual available PDF text and handles missing fields gracefully.**
8. **File hash (SHA-256) is consistent for the same file and sensitive to alterations.**
9. **Exact duplicate documents are detected via binary hash and normalized identifiers.**
10. **Similar records show matching and differing fields with explainable reasons.**
11. **Unrelated records are not automatically marked as duplicates.**
12. **Amount mismatch produces an explainable review flag with evidence trace.**
13. **Correcting mismatch recalculates applicable risk score dynamically.**
14. **Upcoming maturity generates correct reminder and categorizes countdown days.**
15. **Repeated scheduled checks do not create duplicate reminders (Idempotent Notification Handling).**
16. **Renewal preserves original instrument's history and creates traceable lineage.**
17. **Invalid lifecycle transitions are strictly rejected by the lifecycle state machine.**
18. **Release requests follow two-tier authorization and approval rules.**
19. **Dashboard counts match underlying database queries.**
20. **CSV export contains filtered authorized records with spreadsheet formula injection protection.**
21. **Officer field corrections create immutable audit entries with before/after state diff.**
22. **Unauthorized users and tampered tokens are rejected by JWT security verification.**
23. **Empty datasets and unavailable verification sources are handled gracefully without exceptions.**
24. **All existing working core features continue to work after changes (Zero Regression).**
25. **Every seeded FDR has a preloaded document record and valid PDF file on disk.**
26. **Individual document associations are unique per FDR; intentional duplicates share identical hash.**
27. **Institution Administrator is strictly prohibited from accessing another institution's documents.**
28. **Authorized Regulation Officer has global scrutiny access to view all permitted institutional documents.**
29. **Assistant handles missing GEMINI_API_KEY gracefully with clear configuration guidance.**
30. **Assistant grounds queries strictly in authorized data and enforces tenant isolation for Institution Admins.**
31. **Gemini API error conditions return friendly fallback without throwing uncaught exceptions.**
32. **Dashboard pie chart risk aggregation computes consistent totals, percentages, and handles empty sets safely.**
33. **Sidebar active routing highlights only the active tab, isolates /fdrs/new from /fdrs, and maps nested routes.**

### Step 4: Launch the Application
```bash
npm run dev
```
This launches concurrently:
* **Backend REST API:** `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)
* **Frontend Web Application:** `http://localhost:5173`

*(Alternatively, run `npm run build` followed by `npm start --prefix server` to serve the unified production application directly from `http://localhost:5000`).*

---

## 7. Sample Demonstration Workflow

1. **Login as Institution Administrator:**
   * Navigate to `http://localhost:5173/login`.
   * Click quick login button: **3. Institution Administrator (Apex Tech)** (`admin@apextech.edu.in`).
   * Observe institution-isolated dashboard: only Apex Tech's instruments are visible.
   * Go to **Document Extraction** (`/documents`), select FDR-SBI-2024-88921, and test upload from `sample_documents/Sample_SBI_FDR_Receipt.pdf`.
   * Review extracted fields and click **Confirm Official Values**.

2. **Login as Regulation Officer (Zero-Upload Demonstration & Preloaded In-Browser Document Viewer):**
   * Logout and click quick login: **2. Regulation Officer** (`officer.sharma@fdrsecuretrack.gov.in`).
   * **Officer Dashboard Metrics & Table:**
     * View the 6 live operational metrics: **Total FDRs**, **Active FDRs**, **Approaching Maturity**, **Matured / Expired**, **Pending Verification**, and **Records with Discrepancies**.
     * Inspect the unified FDR table with all 9 regulatory columns: Institution Name, FDR Reference No, Bank Name, Amount, Issue Date, Maturity Date, Verification Status, Risk/Review Status, and the **View FDR** action button.
   * **In-Browser Document Scrutiny & Multi-Document Viewer:**
     * Click **View FDR** on any record (e.g., `FDR-SBI-2024-88921` or `FDR-HDFC-2023-41029`).
     * Inspect the authentic synthetic PDF document directly inside the browser window with zero manual file uploads required.
     * Switch tabs between the **Primary FDR Certificate** and **Bank Confirmation Letter / Supporting Documents**.
     * Inspect the side-by-side **Extracted Document vs Database Record** comparison matrix highlighting matched values in green and discrepant values in red.
     * Record an official regulatory observation under **Officer Determination** (e.g. `DEMO_VERIFIED`, `DEMO_MISMATCH`, or `REQUIRES_SCRUTINY`) with mandatory justification, which instantly commits to the immutable audit trail and recalculates the risk score.
   * **Discrepancy & Duplicate Case Inspections:**
     * Inspect `FDR-SBI-2025-66112` (`fdr-013`): Observe the flagged amount discrepancy (submitted ₹55,00,000 vs extracted certificate ₹50,00,000) with critical risk score.
     * Open **Duplicate Scrutiny** (`/duplicates`): inspect the exact collision between Apex Tech and Himalayan Institute on `FDR-DUP-GLOBAL-777` (`fdr-016` & `fdr-017`) sharing identical binary PDF SHA-256 hashes.
   * **Officer Workbench (`/workbench`):** Inspect cases ranked by deterministic priority with bulleted ranking reasons and due dates.

3. **Bilingual Voice Assistant:**
   * Click the **Voice Assistant** pill in the top navigation bar or navigate to `/assistant`.
   * Switch language between English and தமிழ்.
   * Ask:
     * *"Show FDRs maturing in the next 30 days"*
     * *"இந்த மாதம் maturity ஆகும் FDR-களை காட்டு"*
     * *"Why does this FDR have a high risk score?"*
     * *"என்னுடைய pending cases என்ன?"*
   * Click the returned case links to open the underlying verified record.

4. **Login as Super Admin:**
   * Logout and login as **1. Super Admin** (`admin@fdrsecuretrack.gov.in`).
   * Navigate to **Release & Refund** (`/release-requests`) and authorize the pending release application for Dr. APJ Abdul Kalam College of Pharmacy.
   * Navigate to **Reports & Export** (`/reports`) and click **Download Official CSV** to export live database records.
   * Navigate to **Audit Trail** (`/audit`) to inspect the immutable chronological log.

---

## 8. Simulated Bank Integration & Limitations

* **Simulated Bank Verification Adapter:** In accordance with regulatory guidelines, this demonstration uses an internal `SimulatedBankVerificationAdapter` (`SimulatedCoreBankingGateway-v2.1`). It explicitly labels confirmations as `DEMO_VERIFIED` or `DEMO_MISMATCH` and includes clear demonstration disclaimers. It does not connect to live banking networks or transfer money.
* **OCR & Document Extraction:** Standard text-based PDF documents are parsed deterministically via `pdf-parse`. For scanned documents or image files, the application uses regex heuristic extraction with mock OCR fallback. If OCR is unavailable, manual review confirmation is provided rather than fabricating data.
* **Rule-Based Risk Model:** Risk scoring is transparent, explainable, and deterministic (0–100 points). It is rule-based and configurable by authorized administrators; it does not utilize blackbox algorithms or biased personal attributes.
