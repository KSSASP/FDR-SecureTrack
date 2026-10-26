import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { query, queryOne, run } from '../db/database.js';

export interface FdrDocumentMeta {
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  institutionCode?: string;
  bankName: string;
  branchName: string;
  amount: number;
  issueDate: string;
  maturityDate: string;
  interestRate?: number | null;
  appRef?: string | null;
  depositType?: string;
  // Discrepancy overrides for deliberate test cases
  displayAmount?: number;
  displayFdrNumber?: string;
}

export interface SupportingDocMeta {
  fdrId: string;
  fdrNumber: string;
  institutionName: string;
  bankName: string;
  title: string;
  docType: string;
  contentLines: string[];
}

/**
 * Pure TypeScript PDF-1.4 Generator
 * Generates standards-compliant, dependency-free PDF documents readable by any PDF viewer.
 */
function buildRawPdf(lines: { text: string; bold?: boolean; size?: number; x?: number; y?: number }[]): Buffer {
  const contentParts: string[] = [];

  // Certificate Borders
  contentParts.push('0.75 w 0.15 0.25 0.55 RG'); // Slate Navy Stroke
  contentParts.push('30 30 552 732 re S');      // Outer border (Margin ~0.4 in)
  contentParts.push('0.5 w 0.35 0.45 0.7 RG');
  contentParts.push('36 36 540 720 re S');      // Inner border

  // Draw text lines
  contentParts.push('0 0 0 rg'); // default black text
  for (const item of lines) {
    const x = item.x ?? 50;
    const y = item.y ?? 700;
    const size = item.size ?? 10;
    const font = item.bold ? '/F1' : '/F2';
    const safeText = item.text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    contentParts.push(`BT 1 0 0 1 ${x} ${y} Tm ${font} ${size} Tf (${safeText}) Tj ET`);
  }

  const streamContent = contentParts.join('\n') + '\n';
  const streamBuf = Buffer.from(streamContent, 'utf-8');
  const streamLen = streamBuf.length;

  const objects: { num: number; body: string }[] = [];

  objects.push({ num: 1, body: '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj' });
  objects.push({ num: 2, body: '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj' });
  objects.push({
    num: 3,
    body: `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>>>>>>\nendobj`
  });
  objects.push({
    num: 4,
    body: `4 0 obj\n<</Length ${streamLen}>>\nstream\n${streamContent}endstream\nendobj`
  });
  objects.push({ num: 5, body: '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>\nendobj' });
  objects.push({ num: 6, body: '6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj' });

  let pdfString = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdfString, 'utf-8'));
    pdfString += obj.body + '\n';
  }

  const startXref = Buffer.byteLength(pdfString, 'utf-8');
  pdfString += `xref\n0 ${objects.length + 1}\n`;
  pdfString += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    pdfString += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  pdfString += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdfString, 'utf-8');
}

export class PdfGeneratorService {
  /**
   * Generates a realistic synthetic FDR certificate PDF buffer
   */
  generateFdrCertificatePdf(meta: FdrDocumentMeta): Buffer {
    const amtNumber = meta.displayAmount !== undefined ? meta.displayAmount : meta.amount;
    const formattedAmt = `INR ${Number(amtNumber).toLocaleString('en-IN')}.00`;
    const fdrNumToDisplay = meta.displayFdrNumber || meta.fdrNumber;
    const rateText = meta.interestRate ? `${meta.interestRate}% p.a.` : '7.15% p.a.';

    const lines: { text: string; bold?: boolean; size?: number; x?: number; y?: number }[] = [
      // Top Header
      { text: '========================================================================', bold: true, size: 9, x: 48, y: 742 },
      { text: 'CENTRAL REGULATORY REPOSITORY - TERM DEPOSIT RECEIPT ARCHIVE', bold: true, size: 10, x: 90, y: 730 },
      { text: '========================================================================', bold: true, size: 9, x: 48, y: 718 },

      // Bank Title
      { text: meta.bankName.toUpperCase(), bold: true, size: 16, x: 48, y: 686 },
      { text: `Branch: ${meta.branchName}`, bold: false, size: 10, x: 48, y: 668 },
      { text: 'TERM DEPOSIT RECEIPT / SECURITY DEPOSIT CERTIFICATE', bold: true, size: 12, x: 48, y: 646 },
      { text: 'Issued under Institutional Regulatory Compliance Security Deposit Provisions', bold: false, size: 9, x: 48, y: 632 },

      // Divider
      { text: '------------------------------------------------------------------------------------------------------------------------', bold: false, size: 9, x: 48, y: 618 },

      // Field Values
      { text: `FDR Reference Number:  ${fdrNumToDisplay}`, bold: true, size: 11, x: 48, y: 596 },
      { text: `Depositor Institution:  ${meta.institutionName}`, bold: false, size: 11, x: 48, y: 574 },
      { text: `Institution Code:         ${meta.institutionCode || 'INST-REG-COMPLIANCE'}`, bold: false, size: 10, x: 48, y: 554 },
      { text: `Principal Amount:       ${formattedAmt}`, bold: true, size: 12, x: 48, y: 530 },
      { text: `Date of Issue:              ${meta.issueDate}`, bold: false, size: 10, x: 48, y: 508 },
      { text: `Date of Maturity:         ${meta.maturityDate}`, bold: true, size: 10, x: 48, y: 488 },
      { text: `Contracted Rate:        ${rateText}`, bold: false, size: 10, x: 48, y: 468 },
      { text: `Deposit Category:       ${meta.depositType || 'SECURITY_DEPOSIT'}`, bold: false, size: 10, x: 48, y: 448 },
      { text: `Approval Reference:   ${meta.appRef || 'AICTE-REG-2024'}`, bold: false, size: 10, x: 48, y: 428 },

      // Branch Seal Simulation Box
      { text: '------------------------------------------------------------------------------------------------------------------------', bold: false, size: 9, x: 48, y: 400 },
      { text: `[ OFFICIAL SEAL - ${meta.bankName.toUpperCase()} - AUTHORIZED SIGNATORY ]`, bold: true, size: 9, x: 80, y: 375 },
      { text: 'Branch Verification Officer: Verified & Encumbered in Favor of Regulatory Authority', bold: false, size: 8, x: 80, y: 358 },
      { text: '------------------------------------------------------------------------------------------------------------------------', bold: false, size: 9, x: 335 },

      // Legal & Compliance Lien Notice
      { text: 'REGULATORY COMPLIANCE LIEN NOTICE:', bold: true, size: 9, x: 48, y: 310 },
      { text: 'This deposit is pledged as a security deposit for regulatory approval. Premature withdrawal', bold: false, size: 8, x: 48, y: 295 },
      { text: 'or encashment is strictly prohibited without written authorization from the Competent Authority.', bold: false, size: 8, x: 48, y: 282 },

      // Repository Compliance Footer
      { text: '****************************************************************************************************', bold: false, size: 8, x: 48, y: 105 },
      { text: 'ELECTRONIC REPOSITORY RECORD: Managed under FDR SecureTrack Central Repository Archive.', bold: true, size: 8, x: 48, y: 92 },
      { text: 'Maintained for statutory regulatory compliance, lifecycle tracking, and institutional lien verification.', bold: false, size: 8, x: 48, y: 80 },
      { text: '****************************************************************************************************', bold: false, size: 8, x: 48, y: 68 }
    ];

    return buildRawPdf(lines);
  }

  /**
   * Generates a supporting document PDF (e.g. Bank Confirmation Letter, Lien Acknowledgment)
   */
  generateSupportingDocumentPdf(meta: SupportingDocMeta): Buffer {
    const lines: { text: string; bold?: boolean; size?: number; x?: number; y?: number }[] = [
      { text: '========================================================================', bold: true, size: 9, x: 48, y: 742 },
      { text: 'CENTRAL REGULATORY REPOSITORY - SUPPORTING ATTESTATION ARCHIVE', bold: true, size: 10, x: 85, y: 730 },
      { text: '========================================================================', bold: true, size: 9, x: 48, y: 718 },

      { text: meta.bankName.toUpperCase(), bold: true, size: 14, x: 48, y: 686 },
      { text: meta.title.toUpperCase(), bold: true, size: 12, x: 48, y: 660 },
      { text: `Ref FDR Serial: ${meta.fdrNumber}`, bold: false, size: 10, x: 48, y: 640 },
      { text: `Beneficiary / Depositor: ${meta.institutionName}`, bold: false, size: 10, x: 48, y: 620 },
      { text: '------------------------------------------------------------------------------------------------------------------------', bold: false, size: 9, x: 48, y: 600 }
    ];

    let currentY = 575;
    for (const paragraph of meta.contentLines) {
      lines.push({ text: paragraph, bold: false, size: 9, x: 48, y: currentY });
      currentY -= 20;
    }

    currentY = Math.min(currentY - 20, 320);
    lines.push({ text: '------------------------------------------------------------------------------------------------------------------------', bold: false, size: 9, x: 48, y: currentY });
    lines.push({ text: `[ CONFIRMATION SEAL - ${meta.bankName} COMPLIANCE CELL ]`, bold: true, size: 9, x: 100, y: currentY - 25 });
    lines.push({ text: 'Certified Copy for Regulatory Scrutiny Archive', bold: false, size: 8, x: 100, y: currentY - 40 });

    lines.push({ text: 'ELECTRONIC ATTESTATION RECORD - ARCHIVED FOR REGULATORY SCRUTINY', bold: true, size: 8, x: 48, y: 80 });

    return buildRawPdf(lines);
  }

  /**
   * Scans database FDRs and ensures every single FDR has an associated PDF file on disk
   * and a linked record in the `documents` table.
   * Repeatable, non-destructive, and automatically run on startup.
   */
  async ensureSeededDocumentsExist(): Promise<number> {
    const uploadDir = config.uploadDir;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fdrs = await query<any>(`
      SELECT f.*, i.name as institution_name, i.code as institution_code
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      WHERE f.is_archived = 0
    `);

    let createdCount = 0;
    const nowIso = new Date().toISOString();

    for (const fdr of fdrs) {
      // Check if this FDR already has an active FDR_CERTIFICATE document
      const existingDoc = await queryOne<any>(`
        SELECT * FROM documents
        WHERE fdr_id = ? AND document_type = 'FDR_CERTIFICATE'
        LIMIT 1
      `, [fdr.id]);

      // Deterministic stored filename based on FDR ID
      const storedFilename = `fdr_${fdr.id.replace(/-/g, '_')}_certificate.pdf`;
      const filePath = path.join(uploadDir, storedFilename);

      // Handle deliberate test cases:
      // fdr-013 is deliberate discrepancy: form has ₹55L, certificate has ₹50L
      let displayAmount = fdr.amount;
      if (fdr.id === 'fdr-013') {
        displayAmount = 5000000; // 50 Lakhs on certificate
      }

      // fdr-016 and fdr-017 are deliberate duplicate collision:
      // fdr-017 should reuse fdr-016's certificate so they have identical binary hash!
      let pdfBuffer: Buffer;
      if (fdr.id === 'fdr-017') {
        // Reuse fdr-016 certificate buffer if already generated or generate with fdr-016 parameters
        const fdr16 = fdrs.find(f => f.id === 'fdr-016') || fdr;
        pdfBuffer = this.generateFdrCertificatePdf({
          fdrId: 'fdr-016',
          fdrNumber: fdr16.fdr_number,
          institutionId: fdr16.institution_id,
          institutionName: fdr16.institution_name,
          institutionCode: fdr16.institution_code,
          bankName: fdr16.bank_name,
          branchName: fdr16.branch_name,
          amount: fdr16.amount,
          issueDate: fdr16.issue_date,
          maturityDate: fdr16.maturity_date,
          interestRate: fdr16.interest_rate,
          appRef: fdr16.linked_application_ref,
          depositType: fdr16.deposit_type
        });
      } else {
        pdfBuffer = this.generateFdrCertificatePdf({
          fdrId: fdr.id,
          fdrNumber: fdr.fdr_number,
          institutionId: fdr.institution_id,
          institutionName: fdr.institution_name,
          institutionCode: fdr.institution_code,
          bankName: fdr.bank_name,
          branchName: fdr.branch_name,
          amount: fdr.amount,
          displayAmount,
          issueDate: fdr.issue_date,
          maturityDate: fdr.maturity_date,
          interestRate: fdr.interest_rate,
          appRef: fdr.linked_application_ref,
          depositType: fdr.deposit_type
        });
      }

      // Always ensure the updated clean file is written to disk
      fs.writeFileSync(filePath, pdfBuffer);

      // Compute cryptographic SHA-256 binary hash
      const realFileHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      const fileSize = pdfBuffer.length;
      const originalFilename = `${fdr.fdr_number.replace(/[^a-zA-Z0-9_-]/g, '_')}_Official_Receipt.pdf`;

      if (!existingDoc) {
        const docId = `doc-${fdr.id}`;
        await run(`
          INSERT INTO documents (
            id, fdr_id, institution_id, original_filename, stored_filename, file_path,
            file_size, mime_type, document_type, document_hash, status, version, uploaded_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'application/pdf', 'FDR_CERTIFICATE', ?, 'ACCEPTED', 1, 'usr-admin-1', ?, ?)
        `, [
          docId,
          fdr.id,
          fdr.institution_id,
          originalFilename,
          storedFilename,
          filePath,
          fileSize,
          realFileHash,
          nowIso,
          nowIso
        ]);
        createdCount++;
      } else {
        // Ensure the path and hash in database match the actual disk file
        await run(`
          UPDATE documents
          SET file_path = ?, file_size = ?, document_hash = ?, stored_filename = ?, updated_at = ?
          WHERE id = ?
        `, [filePath, fileSize, realFileHash, storedFilename, nowIso, existingDoc.id]);
      }
    }

    // Add supporting documents for select FDRs to demonstrate multi-document associations
    const supportingCases = [
      {
        fdrId: 'fdr-001',
        instId: 'inst-101',
        title: 'Bank Confirmation Letter',
        docType: 'BANK_CONFIRMATION',
        storedName: 'fdr_001_bank_confirmation.pdf',
        origName: 'SBI_Parliament_St_Lien_Confirmation.pdf',
        paragraphs: [
          'This is to certify that Fixed Deposit Receipt No. FDR-SBI-2024-88921 for INR 50,00,000/-',
          'has been duly created and noted with a regulatory lien in favor of the Competent Authority.',
          'The funds are held in fixed term custody and shall not be released without an authorized decree.'
        ]
      },
      {
        fdrId: 'fdr-002',
        instId: 'inst-102',
        title: 'Board Resolution & Compliance Affidavit',
        docType: 'COMPLIANCE_AFFIDAVIT',
        storedName: 'fdr_002_board_resolution.pdf',
        origName: 'NEC_Pune_Board_Resolution_Affidavit.pdf',
        paragraphs: [
          'Affidavit submitted by the Governing Body of National Engineering College, Pune.',
          'Resolving to maintain the required security deposit with Punjab National Bank',
          'in full compliance with statutory approval norms and conditions.'
        ]
      },
      {
        fdrId: 'fdr-020',
        instId: 'inst-101',
        title: 'Renewal Deposit Acknowledgment Slip',
        docType: 'BANK_CONFIRMATION',
        storedName: 'fdr_020_renewal_acknowledgment.pdf',
        origName: 'SBI_Renewal_Deposit_Acknowledgment.pdf',
        paragraphs: [
          'Acknowledgment of institutional renewal application for matured instrument.',
          'Replacement FDR reference FDR-SBI-2025-RENEW-101 has been provisionally accepted',
          'for continuation of institutional security deposit obligations.'
        ]
      }
    ];

    for (const sup of supportingCases) {
      const fdr = fdrs.find(f => f.id === sup.fdrId);
      if (!fdr) continue;

      const filePath = path.join(uploadDir, sup.storedName);
      const pdfBuffer = this.generateSupportingDocumentPdf({
        fdrId: sup.fdrId,
        fdrNumber: fdr.fdr_number,
        institutionName: fdr.institution_name,
        bankName: fdr.bank_name,
        title: sup.title,
        docType: sup.docType,
        contentLines: sup.paragraphs
      });

      // Always ensure the updated clean file is written to disk
      fs.writeFileSync(filePath, pdfBuffer);

      const realHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      const docId = `doc-sup-${sup.fdrId}`;

      const existingSup = await queryOne<any>(`SELECT id FROM documents WHERE id = ?`, [docId]);
      if (!existingSup) {
        await run(`
          INSERT INTO documents (
            id, fdr_id, institution_id, original_filename, stored_filename, file_path,
            file_size, mime_type, document_type, document_hash, status, version, uploaded_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'application/pdf', ?, ?, 'ACCEPTED', 1, 'usr-admin-1', ?, ?)
        `, [
          docId,
          sup.fdrId,
          sup.instId,
          sup.origName,
          sup.storedName,
          filePath,
          pdfBuffer.length,
          sup.docType,
          realHash,
          nowIso,
          nowIso
        ]);
        createdCount++;
      } else {
        await run(`
          UPDATE documents
          SET file_path = ?, file_size = ?, document_hash = ?, stored_filename = ?, updated_at = ?
          WHERE id = ?
        `, [filePath, pdfBuffer.length, realHash, sup.storedName, nowIso, existingSup.id]);
      }
    }

    return createdCount;
  }
}

export const pdfGeneratorService = new PdfGeneratorService();
