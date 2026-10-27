import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, exec, run, query, saveDb } from './database.js';
import { SCHEMA_SQL } from './schemaSql.js';
import { pdfGeneratorService } from '../services/pdfGeneratorService.js';

function addDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function subDays(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export async function seedDatabase() {
  console.log('--- Initializing FDR SecureTrack Database Schema ---');
  await exec(SCHEMA_SQL);

  // Clear existing demo data to ensure a clean, reproducible state
  console.log('--- Clearing prior demonstration records ---');
  await exec(`
    DELETE FROM decision_evidence;
    DELETE FROM duplicate_findings;
    DELETE FROM verification_records;
    DELETE FROM document_extractions;
    DELETE FROM documents;
    DELETE FROM renewal_requests;
    DELETE FROM release_requests;
    DELETE FROM risk_assessments;
    DELETE FROM notifications;
    DELETE FROM audit_events;
    DELETE FROM fdr_instruments;
    DELETE FROM users;
    DELETE FROM institutions;
    DELETE FROM system_configs;
  `);

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. System Configs
  console.log('--- Seeding System Configuration ---');
  const configs = [
    { key: 'MATURITY_REMINDER_WINDOWS', value: '90,60,30,15,7,1', description: 'Reminder intervals in days prior to FDR maturity' },
    { key: 'ESCALATION_OVERDUE_DAYS', value: '14', description: 'Days before an overdue renewal escalates to Super Admin' },
    { key: 'RISK_WEIGHT_DISCREPANCY', value: '25', description: 'Max risk points for unresolved document discrepancies' },
    { key: 'RISK_WEIGHT_DUPLICATE', value: '30', description: 'Max risk points for collision or duplicate suspicion' },
    { key: 'RISK_WEIGHT_MISSING_DOC', value: '20', description: 'Risk points for missing mandatory supporting documents' },
    { key: 'RISK_WEIGHT_UNVERIFIED_BANK', value: '15', description: 'Risk points for failed or mismatched bank verification' },
    { key: 'RISK_WEIGHT_OVERDUE_RENEWAL', value: '10', description: 'Risk points for expired maturity without replacement' },
    { key: 'ENABLE_SIMULATED_BANK_API', value: 'true', description: 'Enable simulated bank confirmation adapter for demonstration' },
    { key: 'AI_PROVIDER', value: 'local_deterministic', description: 'AI Tampering and extraction engine' },
  ];

  for (const c of configs) {
    await run(
      'INSERT INTO system_configs (key, value, description, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)',
      [c.key, c.value, c.description, nowIso, 'SYSTEM_INIT']
    );
  }

  // 2. Institutions (8 Synthetic Demo Institutions)
  console.log('--- Seeding 8 Institutions ---');
  const institutions = [
    {
      id: 'inst-101',
      code: 'INST-AICTE-101',
      name: 'Apex Institute of Technology & Research',
      reg: 'REG-2015-DEL-8921',
      state: 'Delhi',
      city: 'New Delhi',
      address: 'Plot 44, Institutional Area, Sector 62',
      email: 'admin@apextech.edu.in',
      phone: '+91-11-2984-7711',
      status: 'ACTIVE'
    },
    {
      id: 'inst-102',
      code: 'INST-AICTE-102',
      name: 'National Engineering College',
      reg: 'REG-2012-MAH-4412',
      state: 'Maharashtra',
      city: 'Pune',
      address: 'Survey 28, Hinjewadi Tech Park Road',
      email: 'admin@nationaleng.edu.in',
      phone: '+91-20-4102-5500',
      status: 'ACTIVE'
    },
    {
      id: 'inst-103',
      code: 'INST-AICTE-103',
      name: 'Bharat Institute of Management Studies',
      reg: 'REG-2018-KAR-6671',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: '88 Electronics City Phase 1',
      email: 'admin@bharatmgmt.edu.in',
      phone: '+91-80-3321-9988',
      status: 'ACTIVE'
    },
    {
      id: 'inst-104',
      code: 'INST-AICTE-104',
      name: 'Dr. APJ Abdul Kalam College of Pharmacy',
      reg: 'REG-2016-TN-5521',
      state: 'Tamil Nadu',
      city: 'Chennai',
      address: '12 GST Road, Guindy',
      email: 'principal@kalampharmacy.edu.in',
      phone: '+91-44-2235-1020',
      status: 'ACTIVE'
    },
    {
      id: 'inst-105',
      code: 'INST-AICTE-105',
      name: 'Saraswati Institute of Polytechnic & Technology',
      reg: 'REG-2019-GUJ-1123',
      state: 'Gujarat',
      city: 'Ahmedabad',
      address: 'SG Highway, Bodakdev',
      email: 'info@saraswatipoly.edu.in',
      phone: '+91-79-2685-4433',
      status: 'ACTIVE'
    },
    {
      id: 'inst-106',
      code: 'INST-AICTE-106',
      name: 'Vanguard Academy of Applied Sciences',
      reg: 'REG-2020-TEL-9981',
      state: 'Telangana',
      city: 'Hyderabad',
      address: 'Road No. 36, Jubilee Hills',
      email: 'registrar@vanguard.edu.in',
      phone: '+91-40-6712-3344',
      status: 'ACTIVE'
    },
    {
      id: 'inst-107',
      code: 'INST-AICTE-107',
      name: 'Himalayan Institute of Higher Education',
      reg: 'REG-2017-UK-3312',
      state: 'Uttarakhand',
      city: 'Dehradun',
      address: 'Rajpur Road, Near Clock Tower',
      email: 'admin@himalayan.edu.in',
      phone: '+91-135-274-8899',
      status: 'UNDER_SCRUTINY'
    },
    {
      id: 'inst-108',
      code: 'INST-AICTE-108',
      name: 'Imperial College of Architecture & Design',
      reg: 'REG-2021-WB-7734',
      state: 'West Bengal',
      city: 'Kolkata',
      address: 'Salt Lake Sector V, Block EP',
      email: 'contact@imperialarch.edu.in',
      phone: '+91-33-4011-8822',
      status: 'ACTIVE'
    }
  ];

  for (const inst of institutions) {
    await run(
      `INSERT INTO institutions (id, code, name, registration_number, state, city, address, contact_email, contact_phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [inst.id, inst.code, inst.name, inst.reg, inst.state, inst.city, inst.address, inst.email, inst.phone, inst.status, nowIso, nowIso]
    );
  }

  // 3. Users (Super Admin, 2 Regulation Officers, 3 Institution Admins)
  console.log('--- Seeding Users ---');
  const salt = await bcrypt.genSalt(10);
  const adminPassHash = await bcrypt.hash('Admin@12345', salt);
  const officerPassHash = await bcrypt.hash('Officer@12345', salt);
  const instPassHash = await bcrypt.hash('Inst@12345', salt);

  const users = [
    {
      id: 'usr-admin-1',
      email: 'admin@fdrsecuretrack.gov.in',
      pass: adminPassHash,
      name: 'Dr. Rajeshwardas Gupta',
      role: 'SUPER_ADMIN',
      instId: null,
      phone: '+91-98100-11223'
    },
    {
      id: 'usr-off-1',
      email: 'officer.sharma@fdrsecuretrack.gov.in',
      pass: officerPassHash,
      name: 'Vikram Sharma (Senior Regulation Officer)',
      role: 'REGULATION_OFFICER',
      instId: null,
      phone: '+91-98200-33445'
    },
    {
      id: 'usr-off-2',
      email: 'officer.raman@fdrsecuretrack.gov.in',
      pass: officerPassHash,
      name: 'Ananya Raman (Scrutiny Officer - Tamil Nadu & South)',
      role: 'REGULATION_OFFICER',
      instId: null,
      phone: '+91-94440-55667'
    },
    {
      id: 'usr-inst-1',
      email: 'admin@apextech.edu.in',
      pass: instPassHash,
      name: 'Prof. Alok Verma (Apex Tech Registrar)',
      role: 'INSTITUTION_ADMIN',
      instId: 'inst-101',
      phone: '+91-98111-77889'
    },
    {
      id: 'usr-inst-2',
      email: 'admin@nationaleng.edu.in',
      pass: instPassHash,
      name: 'Sunita Deshmukh (Finance Head, NEC Pune)',
      role: 'INSTITUTION_ADMIN',
      instId: 'inst-102',
      phone: '+91-98222-88990'
    },
    {
      id: 'usr-inst-3',
      email: 'admin@bharatmgmt.edu.in',
      pass: instPassHash,
      name: 'K. S. Narayanan (Admin, Bharat Mgmt)',
      role: 'INSTITUTION_ADMIN',
      instId: 'inst-103',
      phone: '+91-98800-44556'
    }
  ];

  for (const u of users) {
    await run(
      `INSERT INTO users (id, email, password_hash, name, role, institution_id, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [u.id, u.email, u.pass, u.name, u.role, u.instId, u.phone, nowIso, nowIso]
    );
  }

  // 4. FDR Instruments (25 Synthetic Records with realistic relative dates)
  console.log('--- Seeding 25 FDR Instruments with Full Lifecycle States ---');

  const fdrData = [
    // 1: Active, Verified, Maturing in 28 days (Approaching Maturity)
    {
      id: 'fdr-001',
      fdrNumber: 'FDR-SBI-2024-88921',
      instId: 'inst-101',
      bankName: 'State Bank of India',
      branch: 'Parliament Street, New Delhi',
      amount: 5000000, // 50 Lakhs
      issueDate: subDays(now, 337), // 11 months ago
      maturityDate: addDays(now, 28), // 28 days remaining
      rate: 7.25,
      appRef: 'AICTE-APP-2024-ND-0199',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 10,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 2: Maturing in 14 days (Approaching Maturity window 15 days)
    {
      id: 'fdr-002',
      fdrNumber: 'FDR-PNB-2023-44102',
      instId: 'inst-102',
      bankName: 'Punjab National Bank',
      branch: 'Shivajinagar, Pune',
      amount: 3500000,
      issueDate: subDays(now, 351),
      maturityDate: addDays(now, 14),
      rate: 6.90,
      appRef: 'AICTE-APP-2023-MH-1120',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 25,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'RENEWAL_REQUESTED'
    },
    // 3: Maturing in 5 days (Critical maturity window 7 days)
    {
      id: 'fdr-003',
      fdrNumber: 'FDR-HDFC-2024-11099',
      instId: 'inst-103',
      bankName: 'HDFC Bank',
      branch: 'Koramangala, Bengaluru',
      amount: 10000000, // 1 Crore
      issueDate: subDays(now, 360),
      maturityDate: addDays(now, 5),
      rate: 7.50,
      appRef: 'AICTE-APP-2024-KA-8812',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 35,
      riskLevel: 'MEDIUM',
      officerId: 'usr-off-2',
      renewalStatus: 'REPLACEMENT_SUBMITTED'
    },
    // 4: Maturing tomorrow (Urgent window 1 day)
    {
      id: 'fdr-004',
      fdrNumber: 'FDR-CAN-2023-99120',
      instId: 'inst-104',
      bankName: 'Canara Bank',
      branch: 'Anna Salai, Chennai',
      amount: 2500000,
      issueDate: subDays(now, 364),
      maturityDate: addDays(now, 1),
      rate: 7.10,
      appRef: 'AICTE-APP-2023-TN-0441',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 65,
      riskLevel: 'HIGH',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 5: Matured 10 days ago (Already Matured)
    {
      id: 'fdr-005',
      fdrNumber: 'FDR-BOB-2023-33290',
      instId: 'inst-105',
      bankName: 'Bank of Baroda',
      branch: 'Ashram Road, Ahmedabad',
      amount: 4000000,
      issueDate: subDays(now, 375),
      maturityDate: subDays(now, 10),
      rate: 7.00,
      appRef: 'AICTE-APP-2023-GJ-7719',
      status: 'MATURED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 70,
      riskLevel: 'HIGH',
      officerId: 'usr-off-1',
      renewalStatus: 'RENEWAL_REQUESTED'
    },
    // 6: Matured 35 days ago (Overdue Renewal)
    {
      id: 'fdr-006',
      fdrNumber: 'FDR-UBI-2023-11244',
      instId: 'inst-106',
      bankName: 'Union Bank of India',
      branch: 'Banjara Hills, Hyderabad',
      amount: 6000000,
      issueDate: subDays(now, 400),
      maturityDate: subDays(now, 35),
      rate: 6.85,
      appRef: 'AICTE-APP-2023-TS-2219',
      status: 'MATURED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 85,
      riskLevel: 'CRITICAL',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 7: Matured 60 days ago (Critically Overdue)
    {
      id: 'fdr-007',
      fdrNumber: 'FDR-ICICI-2022-90112',
      instId: 'inst-107',
      bankName: 'ICICI Bank',
      branch: 'Clock Tower, Dehradun',
      amount: 3000000,
      issueDate: subDays(now, 425),
      maturityDate: subDays(now, 60),
      rate: 7.15,
      appRef: 'AICTE-APP-2022-UK-0091',
      status: 'MATURED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 90,
      riskLevel: 'CRITICAL',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 8: Pending Verification (Case 1)
    {
      id: 'fdr-008',
      fdrNumber: 'FDR-SBI-2026-44011',
      instId: 'inst-101',
      bankName: 'State Bank of India',
      branch: 'Nehru Place, New Delhi',
      amount: 7500000,
      issueDate: subDays(now, 5),
      maturityDate: addDays(now, 360),
      rate: 7.40,
      appRef: 'AICTE-APP-2026-ND-9901',
      status: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING',
      riskScore: 20,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 9: Pending Verification (Case 2 - New Submission)
    {
      id: 'fdr-009',
      fdrNumber: 'FDR-HDFC-2026-55219',
      instId: 'inst-102',
      bankName: 'HDFC Bank',
      branch: 'Aundh, Pune',
      amount: 5000000,
      issueDate: subDays(now, 3),
      maturityDate: addDays(now, 725), // 2 year
      rate: 7.30,
      appRef: 'AICTE-APP-2026-MH-4401',
      status: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING',
      riskScore: 15,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 10: Pending Verification (Case 3 - Bank Simulation Mismatch demo)
    {
      id: 'fdr-010',
      fdrNumber: 'FDR-AXIS-2026-77881',
      instId: 'inst-103',
      bankName: 'Axis Bank',
      branch: 'Whitefield, Bengaluru',
      amount: 8000000,
      issueDate: subDays(now, 7),
      maturityDate: addDays(now, 358),
      rate: 7.20,
      appRef: 'AICTE-APP-2026-KA-5509',
      status: 'DEFICIENT',
      verificationStatus: 'DEMO_MISMATCH',
      riskScore: 75,
      riskLevel: 'HIGH',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 11: Pending Verification (Case 4 - Missing Documents)
    {
      id: 'fdr-011',
      fdrNumber: 'FDR-PNB-2026-90223',
      instId: 'inst-104',
      bankName: 'Punjab National Bank',
      branch: 'T Nagar, Chennai',
      amount: 3000000,
      issueDate: subDays(now, 12),
      maturityDate: addDays(now, 353),
      rate: 6.95,
      appRef: 'AICTE-APP-2026-TN-1102',
      status: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING',
      riskScore: 45,
      riskLevel: 'MEDIUM',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 12: Pending Verification (Case 5 - Fresh submission)
    {
      id: 'fdr-012',
      fdrNumber: 'FDR-BOB-2026-11889',
      instId: 'inst-108',
      bankName: 'Bank of Baroda',
      branch: 'Park Street, Kolkata',
      amount: 4500000,
      issueDate: subDays(now, 2),
      maturityDate: addDays(now, 1093), // 3 year
      rate: 7.50,
      appRef: 'AICTE-APP-2026-WB-8819',
      status: 'SUBMITTED',
      verificationStatus: 'PENDING',
      riskScore: 10,
      riskLevel: 'LOW',
      officerId: null,
      renewalStatus: 'NONE'
    },
    // 13: Inconsistent Record 1 - Amount Discrepancy (Uploaded cert shows 50L, entry shows 55L)
    {
      id: 'fdr-013',
      fdrNumber: 'FDR-SBI-2025-66112',
      instId: 'inst-107',
      bankName: 'State Bank of India',
      branch: 'Dehradun Main',
      amount: 5500000, // Form shows 55 Lakhs, doc has 50 Lakhs
      issueDate: subDays(now, 45),
      maturityDate: addDays(now, 320),
      rate: 7.10,
      appRef: 'AICTE-APP-2025-UK-7721',
      status: 'DEFICIENT',
      verificationStatus: 'DEMO_MISMATCH',
      riskScore: 80,
      riskLevel: 'CRITICAL',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 14: Inconsistent Record 2 - Date Discrepancy (Maturity date typo/alteration)
    {
      id: 'fdr-014',
      fdrNumber: 'FDR-CAN-2025-88331',
      instId: 'inst-105',
      bankName: 'Canara Bank',
      branch: 'Navrangpura, Ahmedabad',
      amount: 3500000,
      issueDate: subDays(now, 60),
      maturityDate: addDays(now, 180), // Document shows 90 days maturity, entered 180 days
      rate: 6.80,
      appRef: 'AICTE-APP-2025-GJ-3390',
      status: 'DEFICIENT',
      verificationStatus: 'PENDING',
      riskScore: 65,
      riskLevel: 'HIGH',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 15: Inconsistent Record 3 - Branch / IFSC mismatch
    {
      id: 'fdr-015',
      fdrNumber: 'FDR-ICICI-2025-44990',
      instId: 'inst-106',
      bankName: 'ICICI Bank',
      branch: 'Hitec City, Hyderabad',
      amount: 4000000,
      issueDate: subDays(now, 30),
      maturityDate: addDays(now, 335),
      rate: 7.00,
      appRef: 'AICTE-APP-2025-TS-9910',
      status: 'DEFICIENT',
      verificationStatus: 'PENDING',
      riskScore: 60,
      riskLevel: 'HIGH',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 16: Cross-Institution Duplicate Scenario A (Original record)
    {
      id: 'fdr-016',
      fdrNumber: 'FDR-DUP-GLOBAL-777',
      instId: 'inst-101', // Institution 101 submitted this
      bankName: 'State Bank of India',
      branch: 'Connaught Place, New Delhi',
      amount: 6000000,
      issueDate: subDays(now, 90),
      maturityDate: addDays(now, 275),
      rate: 7.20,
      appRef: 'AICTE-APP-2025-ND-4411',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 20,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 17: Cross-Institution Duplicate Scenario A (Exact Duplicate submitted by Institution 107!)
    {
      id: 'fdr-017',
      fdrNumber: 'FDR-DUP-GLOBAL-777', // Same FDR number, same bank!
      instId: 'inst-107', // Institution 107 tried to reuse FDR-DUP-GLOBAL-777!
      bankName: 'State Bank of India',
      branch: 'Connaught Place, New Delhi',
      amount: 6000000,
      issueDate: subDays(now, 20),
      maturityDate: addDays(now, 345),
      rate: 7.20,
      appRef: 'AICTE-APP-2026-UK-1100',
      status: 'DEFICIENT',
      verificationStatus: 'PENDING',
      riskScore: 95,
      riskLevel: 'CRITICAL',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    },
    // 18: Cross-Institution Duplicate Scenario B (Strong Potential Match / Fingerprint collision)
    {
      id: 'fdr-018',
      fdrNumber: 'FDR-PNB-2024-99881',
      instId: 'inst-103',
      bankName: 'Punjab National Bank',
      branch: 'MG Road, Bengaluru',
      amount: 5000000,
      issueDate: subDays(now, 120),
      maturityDate: addDays(now, 245),
      rate: 7.10,
      appRef: 'AICTE-APP-2024-KA-1199',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 15,
      riskLevel: 'LOW',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 19: Cross-Institution Duplicate Scenario B (Strong Match submitted by Inst 108)
    {
      id: 'fdr-019',
      fdrNumber: 'FDR-PNB-2024-99881A', // Minor variation in number, identical amount, bank, dates
      instId: 'inst-108',
      bankName: 'Punjab National Bank',
      branch: 'MG Road, Bengaluru',
      amount: 5000000,
      issueDate: subDays(now, 120),
      maturityDate: addDays(now, 245),
      rate: 7.10,
      appRef: 'AICTE-APP-2026-WB-4411',
      status: 'DEFICIENT',
      verificationStatus: 'PENDING',
      riskScore: 85,
      riskLevel: 'CRITICAL',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 20: Renewal Workflow 1 - Original Matured FDR
    {
      id: 'fdr-020',
      fdrNumber: 'FDR-HDFC-2023-33110',
      instId: 'inst-101',
      bankName: 'HDFC Bank',
      branch: 'Barakhamba Road, New Delhi',
      amount: 4000000,
      issueDate: subDays(now, 380),
      maturityDate: subDays(now, 15),
      rate: 6.90,
      appRef: 'AICTE-APP-2023-ND-8890',
      status: 'REPLACED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 20,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'REPLACEMENT_ACCEPTED'
    },
    // 21: Renewal Workflow 1 - Replacement Instrument Accepted
    {
      id: 'fdr-021',
      fdrNumber: 'FDR-HDFC-2026-33110-R1',
      instId: 'inst-101',
      bankName: 'HDFC Bank',
      branch: 'Barakhamba Road, New Delhi',
      amount: 4000000,
      issueDate: subDays(now, 10),
      maturityDate: addDays(now, 355),
      rate: 7.30,
      appRef: 'AICTE-APP-2023-ND-8890',
      status: 'VERIFIED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 10,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE',
      replacementForFdrId: 'fdr-020'
    },
    // 22: Renewal Workflow 2 - Replacement Pending Review
    {
      id: 'fdr-022',
      fdrNumber: 'FDR-SBI-2026-11990-R2',
      instId: 'inst-102',
      bankName: 'State Bank of India',
      branch: 'FC Road, Pune',
      amount: 3500000,
      issueDate: subDays(now, 4),
      maturityDate: addDays(now, 361),
      rate: 7.20,
      appRef: 'AICTE-APP-2023-MH-1120',
      status: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING',
      riskScore: 30,
      riskLevel: 'MEDIUM',
      officerId: 'usr-off-1',
      renewalStatus: 'REPLACEMENT_PENDING_REVIEW',
      replacementForFdrId: 'fdr-002'
    },
    // 23: Release / Refund Workflow 1 - Submitted & Under Review
    {
      id: 'fdr-023',
      fdrNumber: 'FDR-CAN-2022-77119',
      instId: 'inst-103',
      bankName: 'Canara Bank',
      branch: 'Jayanagar, Bengaluru',
      amount: 5000000,
      issueDate: subDays(now, 730), // 2 years ago
      maturityDate: subDays(now, 30),
      rate: 6.75,
      appRef: 'AICTE-APP-2022-KA-0012',
      status: 'RELEASE_REQUESTED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 15,
      riskLevel: 'LOW',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 24: Release / Refund Workflow 2 - Recommended & Awaiting Authority
    {
      id: 'fdr-024',
      fdrNumber: 'FDR-BOB-2021-55441',
      instId: 'inst-104',
      bankName: 'Bank of Baroda',
      branch: 'Mount Road, Chennai',
      amount: 3000000,
      issueDate: subDays(now, 1095), // 3 years ago
      maturityDate: subDays(now, 45),
      rate: 6.50,
      appRef: 'AICTE-APP-2021-TN-7722',
      status: 'RELEASE_REQUESTED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 10,
      riskLevel: 'LOW',
      officerId: 'usr-off-2',
      renewalStatus: 'NONE'
    },
    // 25: Release / Refund Workflow 3 - Authorized Decision Recorded & Closed
    {
      id: 'fdr-025',
      fdrNumber: 'FDR-UBI-2020-11002',
      instId: 'inst-105',
      bankName: 'Union Bank of India',
      branch: 'CG Road, Ahmedabad',
      amount: 2500000,
      issueDate: subDays(now, 1460), // 4 years ago
      maturityDate: subDays(now, 120),
      rate: 6.25,
      appRef: 'AICTE-APP-2020-GJ-4491',
      status: 'RELEASED',
      verificationStatus: 'DEMO_VERIFIED',
      riskScore: 5,
      riskLevel: 'LOW',
      officerId: 'usr-off-1',
      renewalStatus: 'NONE'
    }
  ];

  for (const f of fdrData) {
    await run(
      `INSERT INTO fdr_instruments (
        id, fdr_number, institution_id, bank_name, branch_name, amount, currency,
        deposit_type, linked_application_ref, issue_date, maturity_date, interest_rate,
        current_status, verification_status, risk_score, risk_level, assigned_officer_id,
        replacement_for_fdr_id, renewal_status, is_archived, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'SECURITY_DEPOSIT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'usr-admin-1', ?, ?)`,
      [
        f.id, f.fdrNumber, f.instId, f.bankName, f.branch, f.amount,
        f.appRef, f.issueDate, f.maturityDate, f.rate,
        f.status, f.verificationStatus, f.riskScore, f.riskLevel, f.officerId,
        (f as any).replacementForFdrId || null, f.renewalStatus, nowIso, nowIso
      ]
    );
  }

  // 5. Seed Documents and Extractions
  console.log('--- Seeding Documents and Extraction Findings ---');
  const demoDocs = [
    {
      id: 'doc-001',
      fdrId: 'fdr-001',
      instId: 'inst-101',
      origName: 'SBI_FDR_Receipt_88921.pdf',
      storedName: 'fdr_001_sbi_receipt.pdf',
      docType: 'FDR_CERTIFICATE',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'ACCEPTED'
    },
    {
      id: 'doc-013',
      fdrId: 'fdr-013',
      instId: 'inst-107',
      origName: 'SBI_FixedDeposit_Scanned.pdf',
      storedName: 'fdr_013_sbi_tampered.pdf',
      docType: 'FDR_CERTIFICATE',
      hash: '7d8e202111bbccaa99887766554433221100ffeeddccbbaa9988776655443322',
      status: 'NEEDS_REVIEW'
    },
    {
      id: 'doc-016',
      fdrId: 'fdr-016',
      instId: 'inst-101',
      origName: 'Original_FDR_DUP_GLOBAL_777.pdf',
      storedName: 'fdr_016_dup_global.pdf',
      docType: 'FDR_CERTIFICATE',
      hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      status: 'ACCEPTED'
    },
    {
      id: 'doc-017',
      fdrId: 'fdr-017',
      instId: 'inst-107',
      origName: 'Submitted_FDR_Scan_777.pdf',
      storedName: 'fdr_017_dup_global_reused.pdf',
      docType: 'FDR_CERTIFICATE',
      hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // SAME HASH! Exact duplicate file
      status: 'REJECTED'
    }
  ];

  for (const d of demoDocs) {
    await run(
      `INSERT INTO documents (
        id, fdr_id, institution_id, original_filename, stored_filename, file_path,
        file_size, mime_type, document_type, document_hash, status, version, uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 245760, 'application/pdf', ?, ?, ?, 1, 'usr-admin-1', ?, ?)`,
      [d.id, d.fdrId, d.instId, d.origName, d.storedName, `uploads/${d.storedName}`, d.docType, d.hash, d.status, nowIso, nowIso]
    );
  }

  // Preload and verify that all FDR documents exist on disk and in the database
  await pdfGeneratorService.ensureSeededDocumentsExist();

  // Seed Extraction for fdr-013 (discrepancy demo)
  await run(
    `INSERT INTO document_extractions (
      id, document_id, fdr_id, extracted_fdr_number, extracted_bank_name, extracted_branch,
      extracted_amount, extracted_issue_date, extracted_maturity_date, extracted_interest_rate,
      extracted_institution_name, raw_text, extraction_method, confidence_score, tampering_indicators,
      confirmed_by, confirmed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PDF_TEXT', 0.94, ?, 'usr-off-1', ?, ?)`,
    [
      'ext-013',
      'doc-013',
      'fdr-013',
      'FDR-SBI-2025-66112',
      'State Bank of India',
      'Dehradun Main Branch',
      5000000, // Extracted is 50,000,00, but submitted was 55,000,00!
      subDays(now, 45),
      addDays(now, 320),
      7.10,
      'Himalayan Institute of Higher Education',
      'STATE BANK OF INDIA FDR RECEIPT No: FDR-SBI-2025-66112 Deposit Amount: INR 50,00,000 (Fifty Lakhs Only)',
      JSON.stringify([
        {
          field: 'amount',
          submittedValue: '5,500,000',
          extractedValue: '5,000,000',
          indicator: 'Amount inflated in submission form compared to extracted certificate text',
          severity: 'HIGH'
        }
      ]),
      nowIso,
      nowIso
    ]
  );

  // 6. Duplicate Findings (Cross-Institution Duplicate Scenarios)
  console.log('--- Seeding Duplicate Findings ---');
  await run(
    `INSERT INTO duplicate_findings (
      id, fdr_id, matched_fdr_id, institution_id, matched_institution_id,
      match_category, similarity_score, matching_signals, reason, status, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'dup-001',
      'fdr-017',
      'fdr-016',
      'inst-107',
      'inst-101',
      'EXACT_DUPLICATE',
      1.0,
      JSON.stringify(['IDENTICAL_FDR_NUMBER: FDR-DUP-GLOBAL-777', 'IDENTICAL_BANK: State Bank of India', 'MATCHING_SHA256_HASH']),
      'Exact FDR identifier collision detected across different institutions (Apex Tech vs Himalayan Institute). Suspected reuse of identical financial instrument.',
      'CONFIRMED_DUPLICATE',
      'usr-off-1',
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO duplicate_findings (
      id, fdr_id, matched_fdr_id, institution_id, matched_institution_id,
      match_category, similarity_score, matching_signals, reason, status, reviewed_by, reviewed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'dup-002',
      'fdr-019',
      'fdr-018',
      'inst-108',
      'inst-103',
      'STRONG_POTENTIAL_MATCH',
      0.88,
      JSON.stringify(['NORMALIZED_FDR_SUFFIX_MATCH', 'IDENTICAL_AMOUNT: 50,00,000', 'IDENTICAL_ISSUE_DATE', 'IDENTICAL_BRANCH: MG Road, Bengaluru']),
      'FDR instrument details (amount, bank, branch, dates) strongly match an active FDR already registered for Bharat Management Institute.',
      'OPEN',
      null,
      null,
      nowIso
    ]
  );

  // 7. Verification Records
  console.log('--- Seeding Multi-Stage Verification Records ---');
  await run(
    `INSERT INTO verification_records (
      id, fdr_id, stage, source, status, details, discrepancies, officer_observation,
      resolution_status, resolved_by, resolved_at, created_at
    ) VALUES (?, ?, 'BANK_SIMULATION', 'SIMULATED_BANK_API', 'DEMO_VERIFIED', ?, '[]', 'Verified through simulated core banking adapter', 'RESOLVED', 'usr-off-1', ?, ?)`,
    [
      'ver-001',
      'fdr-001',
      JSON.stringify({ bank: 'State Bank of India', confirmationNo: 'SIM-SBI-99120', verifiedAmount: 5000000, holder: 'Apex Institute of Technology' }),
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO verification_records (
      id, fdr_id, stage, source, status, details, discrepancies, officer_observation,
      resolution_status, resolved_by, resolved_at, created_at
    ) VALUES (?, ?, 'FIELD_VALIDATION', 'INTERNAL_VALIDATOR', 'FAIL', ?, ?, 'Submitted amount exceeds document extracted amount by Rs 5,00,000. Clarification demanded from institution.', 'UNRESOLVED', null, null, ?)`,
    [
      'ver-013',
      'fdr-013',
      JSON.stringify({ checkedFields: ['fdr_number', 'amount', 'dates', 'bank_name'] }),
      JSON.stringify([
        { field: 'amount', submitted: 5500000, extracted: 5000000, message: 'Amount mismatch detected between digital record and certified instrument' }
      ]),
      nowIso
    ]
  );

  // 8. Risk Assessments with Explainable Breakdown
  console.log('--- Seeding Explainable Risk Scores ---');
  await run(
    `INSERT INTO risk_assessments (id, fdr_id, total_score, risk_level, factors, calculated_at)
     VALUES (?, ?, 10, 'LOW', ?, ?)`,
    [
      'risk-001',
      'fdr-001',
      JSON.stringify([
        { name: 'Standard Routine Scrutiny', points: 10, category: 'BASELINE', evidence: 'Routine active instrument under monitoring', resolved: true }
      ]),
      nowIso
    ]
  );

  await run(
    `INSERT INTO risk_assessments (id, fdr_id, total_score, risk_level, factors, calculated_at)
     VALUES (?, ?, 80, 'CRITICAL', ?, ?)`,
    [
      'risk-013',
      'fdr-013',
      JSON.stringify([
        { name: 'Unresolved Field Discrepancy', points: 25, category: 'DISCREPANCY', evidence: 'Submitted amount (Rs 55L) differs from extracted receipt (Rs 50L)', resolved: false },
        { name: 'Bank Verification Mismatch', points: 15, category: 'VERIFICATION', evidence: 'Simulated bank API returned mismatched balance confirmation', resolved: false },
        { name: 'Institution Under Scrutiny', points: 20, category: 'REGULATORY', evidence: 'Parent institution Himalayan Institute is marked UNDER_SCRUTINY', resolved: false },
        { name: 'Document Tampering Indicator', points: 20, category: 'ALTERATION', evidence: 'Confidence score flags possible numerical alteration in scanned PDF', resolved: false }
      ]),
      nowIso
    ]
  );

  await run(
    `INSERT INTO risk_assessments (id, fdr_id, total_score, risk_level, factors, calculated_at)
     VALUES (?, ?, 95, 'CRITICAL', ?, ?)`,
    [
      'risk-017',
      'fdr-017',
      JSON.stringify([
        { name: 'Exact Cross-Institution Identifier Collision', points: 30, category: 'COLLISION', evidence: 'Exact match with FDR-DUP-GLOBAL-777 registered by Apex Tech', resolved: false },
        { name: 'Duplicate Document Fingerprint', points: 25, category: 'DUPLICATE', evidence: 'SHA-256 binary hash matches previously accepted instrument certificate', resolved: false },
        { name: 'Unresolved Regulatory Scrutiny', points: 20, category: 'SCRUTINY', evidence: 'Critical alert flagged to regulatory officer Vikram Sharma', resolved: false },
        { name: 'Suspicious Re-submission', points: 20, category: 'INTEGRITY', evidence: 'Instrument submitted 20 days ago despite 2025 registration reference', resolved: false }
      ]),
      nowIso
    ]
  );

  // 9. Renewal Requests
  console.log('--- Seeding Renewal Workflows ---');
  await run(
    `INSERT INTO renewal_requests (
      id, original_fdr_id, replacement_fdr_id, institution_id, request_date, reason,
      readiness_status, readiness_details, status, officer_comments, decision_date, decided_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, 'ACCEPTED', 'Replacement FDR verified and approved against maturity checklist', ?, 'usr-off-1', ?, ?)`,
    [
      'ren-001',
      'fdr-020',
      'fdr-021',
      'inst-101',
      subDays(now, 12),
      'Prior 1-year security deposit reached maturity. Fresh renewed instrument submitted with updated interest term.',
      JSON.stringify({
        documentsAvailable: true,
        replacementSubmitted: true,
        extractionCompleted: true,
        verificationCompleted: true,
        unresolvedDiscrepancies: false,
        officerReviewDone: true,
        stageDurationEstimateDays: 2
      }),
      subDays(now, 8),
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO renewal_requests (
      id, original_fdr_id, replacement_fdr_id, institution_id, request_date, reason,
      readiness_status, readiness_details, status, officer_comments, decision_date, decided_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'AT_RISK', ?, 'PENDING_REVIEW', 'Awaiting final officer scrutiny on replacement instrument', null, null, ?, ?)`,
    [
      'ren-002',
      'fdr-002',
      'fdr-022',
      'inst-102',
      subDays(now, 3),
      'Scheduled renewal in response to 15-day maturity advisory.',
      JSON.stringify({
        documentsAvailable: true,
        replacementSubmitted: true,
        extractionCompleted: true,
        verificationCompleted: false, // verification pending
        unresolvedDiscrepancies: false,
        officerReviewDone: false,
        stageDurationEstimateDays: 4
      }),
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO renewal_requests (
      id, original_fdr_id, replacement_fdr_id, institution_id, request_date, reason,
      readiness_status, readiness_details, status, officer_comments, decision_date, decided_by, created_at, updated_at
    ) VALUES (?, ?, null, ?, ?, ?, 'NOT_READY', ?, 'PENDING_REVIEW', null, null, null, ?, ?)`,
    [
      'ren-003',
      'fdr-005',
      'inst-105',
      subDays(now, 5),
      'Instrument matured 10 days ago. Bank renewal certificate awaited from branch.',
      JSON.stringify({
        documentsAvailable: false,
        replacementSubmitted: false,
        extractionCompleted: false,
        verificationCompleted: false,
        unresolvedDiscrepancies: false,
        officerReviewDone: false,
        stageDurationEstimateDays: 9
      }),
      nowIso,
      nowIso
    ]
  );

  // 10. Release and Refund Requests
  console.log('--- Seeding Release & Refund Requests ---');
  await run(
    `INSERT INTO release_requests (
      id, fdr_id, institution_id, request_type, reason, submission_date, status,
      eligibility_checklist, officer_observations, decision_comments, first_authorized_by,
      first_authorized_at, second_authorized_by, second_authorized_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'FULL_RELEASE', ?, ?, 'UNDER_REVIEW', ?, 'Scrutiny initiated. No pending compliance defects noted.', null, null, null, null, null, ?, ?)`,
    [
      'rel-001',
      'fdr-023',
      'inst-103',
      'Completion of approved course moratorium and compliance with regulatory norms.',
      subDays(now, 10),
      JSON.stringify({
        moratoriumPeriodCompleted: true,
        noPendingAuditObservations: true,
        originalInstrumentReturned: true,
        noLitigationPending: true,
        councilApprovalAttached: true
      }),
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO release_requests (
      id, fdr_id, institution_id, request_type, reason, submission_date, status,
      eligibility_checklist, officer_observations, decision_comments, first_authorized_by,
      first_authorized_at, second_authorized_by, second_authorized_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'REGULATORY_COMPLETION', ?, ?, 'AWAITING_COMPETENT_AUTHORITY', ?, 'Recommended for full refund upon successful completion of 3-year term.', 'Officer Raman has cleared the initial scrutiny. Forwarded to Super Admin for 2nd tier authorization.', 'usr-off-2', ?, null, null, ?, ?)`,
    [
      'rel-002',
      'fdr-024',
      'inst-104',
      'Closure of temporary branch extension with council clearance certificate.',
      subDays(now, 18),
      JSON.stringify({
        moratoriumPeriodCompleted: true,
        noPendingAuditObservations: true,
        originalInstrumentReturned: true,
        noLitigationPending: true,
        councilApprovalAttached: true
      }),
      subDays(now, 5),
      nowIso,
      nowIso
    ]
  );

  await run(
    `INSERT INTO release_requests (
      id, fdr_id, institution_id, request_type, reason, submission_date, status,
      eligibility_checklist, officer_observations, decision_comments, first_authorized_by,
      first_authorized_at, second_authorized_by, second_authorized_at, created_at, updated_at
    ) VALUES (?, ?, ?, 'FULL_RELEASE', ?, ?, 'AUTHORIZED', ?, 'All eligibility criteria validated.', 'Competent regulatory authority approved final release of deposit receipt.', 'usr-off-1', ?, 'usr-admin-1', ?, ?, ?)`,
    [
      'rel-003',
      'fdr-025',
      'inst-105',
      'Institution upgraded to permanent university status; separate guarantee deposited.',
      subDays(now, 40),
      JSON.stringify({
        moratoriumPeriodCompleted: true,
        noPendingAuditObservations: true,
        originalInstrumentReturned: true,
        noLitigationPending: true,
        councilApprovalAttached: true
      }),
      subDays(now, 25),
      subDays(now, 20),
      nowIso,
      nowIso
    ]
  );

  // 11. Notifications (Role-targeted, deduplicated)
  console.log('--- Seeding Notifications ---');
  const notifications = [
    {
      id: 'notif-001',
      type: 'APPROACHING_MATURITY',
      fdrId: 'fdr-003',
      instId: 'inst-103',
      title: 'FDR Maturing in 5 Days: Koramangala Bengaluru',
      msg: 'Instrument FDR-HDFC-2024-11099 for INR 1,00,00,000 expires in 5 days. Ensure replacement verification is complete.',
      priority: 'URGENT',
      role: 'REGULATION_OFFICER',
      userId: 'usr-off-2',
      read: 0,
      escalated: 0
    },
    {
      id: 'notif-002',
      type: 'DUPLICATE_ALERT',
      fdrId: 'fdr-017',
      instId: 'inst-107',
      title: 'CRITICAL: Cross-Institution Duplicate Collison Detected',
      msg: 'Exact matching FDR number FDR-DUP-GLOBAL-777 was submitted by Himalayan Institute, already registered by Apex Tech.',
      priority: 'CRITICAL',
      role: 'REGULATION_OFFICER',
      userId: 'usr-off-1',
      read: 0,
      escalated: 1
    },
    {
      id: 'notif-003',
      type: 'VERIFICATION_MISMATCH',
      fdrId: 'fdr-013',
      instId: 'inst-107',
      title: 'Discrepancy: Amount Mismatch on Scanned FDR Certificate',
      msg: 'Extracted certificate amount INR 50,00,000 does not match submitted value INR 55,00,000 for Dehradun Main branch.',
      priority: 'HIGH',
      role: 'REGULATION_OFFICER',
      userId: 'usr-off-1',
      read: 0,
      escalated: 0
    },
    {
      id: 'notif-004',
      type: 'RELEASE_AWAITING_REVIEW',
      fdrId: 'fdr-024',
      instId: 'inst-104',
      title: 'Release Request: Awaiting Competent Authority Authorization',
      msg: 'Officer Ananya Raman has recommended release for Dr. APJ Abdul Kalam Pharmacy. Super Admin authorization pending.',
      priority: 'NORMAL',
      role: 'SUPER_ADMIN',
      userId: 'usr-admin-1',
      read: 0,
      escalated: 0
    },
    {
      id: 'notif-005',
      type: 'APPROACHING_MATURITY',
      fdrId: 'fdr-002',
      instId: 'inst-102',
      title: 'Maturity Reminder: 14 Days Remaining',
      msg: 'FDR-PNB-2023-44102 will reach maturity in 14 days. Please monitor submission of renewal instrument.',
      priority: 'NORMAL',
      role: 'INSTITUTION_ADMIN',
      userId: 'usr-inst-2',
      read: 1,
      escalated: 0
    }
  ];

  for (const n of notifications) {
    await run(
      `INSERT INTO notifications (id, event_type, fdr_id, institution_id, title, message, priority, target_role, target_user_id, is_read, is_escalated, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.type, n.fdrId, n.instId, n.title, n.msg, n.priority, n.role, n.userId, n.read, n.escalated, nowIso]
    );
  }

  // 12. Decision Evidence (Traceability Linking)
  console.log('--- Seeding Evidence-Linked Decision Records ---');
  await run(
    `INSERT INTO decision_evidence (
      id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
      findings_summary, evidence_payload, outcome, created_at
    ) VALUES (?, ?, 'RISK_SCORING', 'AUTOMATED_RULE_ENGINE', ?, 'Calculated high risk due to extracted amount mismatch of Rs 5 Lakhs', ?, 'RISK_LEVEL_CRITICAL', ?)`,
    [
      'ev-001',
      'fdr-013',
      JSON.stringify(['doc-013']),
      JSON.stringify({
        rule: 'RULE_AMOUNT_EXTRACT_MISMATCH',
        pointsAssigned: 25,
        submitted: 5500000,
        extracted: 5000000,
        sourceDoc: 'doc-013'
      }),
      nowIso
    ]
  );

  await run(
    `INSERT INTO decision_evidence (
      id, fdr_id, decision_type, responsible_entity, supporting_document_ids,
      findings_summary, evidence_payload, outcome, created_at
    ) VALUES (?, ?, 'DUPLICATE_CHECK', 'CROSS_CHECK_ENGINE', ?, 'Identified exact collision with previously registered instrument', ?, 'FLAGGED_EXACT_COLLISION', ?)`,
    [
      'ev-002',
      'fdr-017',
      JSON.stringify(['doc-016', 'doc-017']),
      JSON.stringify({
        collidingId: 'fdr-016',
        collidingInstitution: 'Apex Institute of Technology & Research',
        fdrNumber: 'FDR-DUP-GLOBAL-777',
        sha256Hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      }),
      nowIso
    ]
  );

  // 13. Audit Events (Append-only timeline)
  console.log('--- Seeding Immutable Audit Events ---');
  const auditLogs = [
    {
      id: 'aud-001',
      userId: 'usr-admin-1',
      name: 'Dr. Rajeshwardas Gupta',
      role: 'SUPER_ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'SYSTEM',
      entityId: 'SYS-GLOBAL',
      instId: null,
      reason: 'Standard system initialization and baseline policy rule configuration'
    },
    {
      id: 'aud-002',
      userId: 'usr-inst-1',
      name: 'Prof. Alok Verma',
      role: 'INSTITUTION_ADMIN',
      action: 'FDR_SUBMISSION',
      entity: 'FDR_INSTRUMENT',
      entityId: 'fdr-001',
      instId: 'inst-101',
      reason: 'Submitted security deposit FDR certificate for session 2024-25'
    },
    {
      id: 'aud-003',
      userId: 'usr-off-1',
      name: 'Vikram Sharma',
      role: 'REGULATION_OFFICER',
      action: 'BANK_VERIFICATION_PASS',
      entity: 'FDR_INSTRUMENT',
      entityId: 'fdr-001',
      instId: 'inst-101',
      reason: 'Simulated core banking adapter confirmation successful. Record moved to VERIFIED status.'
    },
    {
      id: 'aud-004',
      userId: 'usr-off-1',
      name: 'Vikram Sharma',
      role: 'REGULATION_OFFICER',
      action: 'DISCREPANCY_FLAGGED',
      entity: 'FDR_INSTRUMENT',
      entityId: 'fdr-013',
      instId: 'inst-107',
      reason: 'Extracted certificate amount (50L) did not match entered 55L. Status marked DEFICIENT.'
    },
    {
      id: 'aud-005',
      userId: 'usr-off-1',
      name: 'Vikram Sharma',
      role: 'REGULATION_OFFICER',
      action: 'DUPLICATE_COLLISION_RECORDED',
      entity: 'FDR_INSTRUMENT',
      entityId: 'fdr-017',
      instId: 'inst-107',
      reason: 'Flagged fraudulent duplicate submission of FDR-DUP-GLOBAL-777. Escalated to Super Admin.'
    }
  ];

  for (const a of auditLogs) {
    await run(
      `INSERT INTO audit_events (id, user_id, user_name, user_role, action, entity_type, entity_id, institution_id, before_state, after_state, decision_reason, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', ?, '127.0.0.1', ?)`,
      [a.id, a.userId, a.name, a.role, a.action, a.entity, a.entityId, a.instId, a.reason, nowIso]
    );
  }

  console.log('--- Ensuring Preloaded Synthetic FDR Documents & PDFs Exist ---');
  const generatedDocsCount = await pdfGeneratorService.ensureSeededDocumentsExist();
  console.log(`--- Seeded/Updated ${generatedDocsCount} Synthetic Document Files on Disk ---`);

  saveDb();
  console.log('=== FDR SecureTrack Database Successfully Seeded! ===');
  console.log('Demo Credentials:');
  console.log('1. Super Admin: admin@fdrsecuretrack.gov.in / Admin@12345');
  console.log('2. Regulation Officer 1: officer.sharma@fdrsecuretrack.gov.in / Officer@12345');
  console.log('3. Regulation Officer 2: officer.raman@fdrsecuretrack.gov.in / Officer@12345');
  console.log('4. Institution Admin (Apex Tech): admin@apextech.edu.in / Inst@12345');
  console.log('5. Institution Admin (NEC Pune): admin@nationaleng.edu.in / Inst@12345');
  console.log('6. Institution Admin (Bharat Mgmt): admin@bharatmgmt.edu.in / Inst@12345');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Database seeding failed:', err);
      process.exit(1);
    });
}
