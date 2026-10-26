import { v4 as uuidv4 } from 'uuid';
import { query, run, queryOne } from '../db/database.js';

export interface MatchedFieldDetail {
  field: string;
  fieldLabel: string;
  targetValue: string | number;
  candidateValue: string | number;
  matchType: 'EXACT' | 'NORMALIZED' | 'TOLERANCE';
}

export interface DifferingFieldDetail {
  field: string;
  fieldLabel: string;
  targetValue: string | number;
  candidateValue: string | number;
}

export interface DuplicateScanResult {
  matchCategory: 'EXACT_DUPLICATE' | 'STRONG_POTENTIAL_MATCH' | 'WEAK_SIMILARITY' | 'NO_MATCH';
  similarityScore: number;
  matchedFdrId: string | null;
  matchedFdrNumber: string;
  matchedInstitutionId: string | null;
  matchedInstitutionName: string;
  targetInstitutionName: string;
  matchedFields: MatchedFieldDetail[];
  differingFields: DifferingFieldDetail[];
  matchingSignals: string[];
  reason: string;
  recommendedAction: string;
}

// Canonical bank mapping for normalization
const BANK_ALIASES: Record<string, string> = {
  'sbi': 'state bank of india',
  'state bank of india': 'state bank of india',
  'pnb': 'punjab national bank',
  'punjab national bank': 'punjab national bank',
  'hdfc': 'hdfc bank',
  'hdfc bank': 'hdfc bank',
  'icici': 'icici bank',
  'icici bank': 'icici bank',
  'canara': 'canara bank',
  'canara bank': 'canara bank',
  'bob': 'bank of baroda',
  'bank of baroda': 'bank of baroda',
  'axis': 'axis bank',
  'axis bank': 'axis bank',
  'union': 'union bank of india',
  'union bank': 'union bank of india',
  'union bank of india': 'union bank of india',
  'boi': 'bank of india',
  'bank of india': 'bank of india',
  'kotak': 'kotak mahindra bank',
  'kotak mahindra': 'kotak mahindra bank',
  'kotak mahindra bank': 'kotak mahindra bank',
  'indian bank': 'indian bank',
  'idbi': 'idbi bank',
  'idbi bank': 'idbi bank'
};

export class DuplicateDetectionService {
  /**
   * Normalize an FDR alphanumeric identifier
   */
  normalizeFdrNumber(raw: string | null | undefined): string {
    if (!raw) return '';
    // Strip all non-alphanumeric characters and uppercase
    let norm = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Strip common prefixes if still long enough
    if (norm.startsWith('FDRNO') && norm.length > 7) norm = norm.substring(5);
    else if (norm.startsWith('FDR') && norm.length > 5) norm = norm.substring(3);
    else if (norm.startsWith('FD') && norm.length > 4) norm = norm.substring(2);
    return norm;
  }

  /**
   * Normalize bank name using known aliases and token normalization
   */
  normalizeBankName(raw: string | null | undefined): string {
    if (!raw) return '';
    const clean = raw.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    for (const [alias, canonical] of Object.entries(BANK_ALIASES)) {
      if (clean === alias || clean === canonical || clean.includes(alias) || clean.includes(canonical)) {
        return canonical;
      }
    }
    // Generic stripping of company suffixes
    return clean.replace(/\b(limited|ltd|bank|cooperative|coop|corp)\b/g, '').trim();
  }

  /**
   * Normalize branch identifiers
   */
  normalizeBranch(raw: string | null | undefined): string {
    if (!raw) return '';
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\b(branch|br|banch|road|rd|street|st|marg|bhavan|complex|main)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if amounts match exactly or within tolerance
   */
  compareAmounts(a: number, b: number): { matches: boolean; type: 'EXACT' | 'TOLERANCE' | 'NONE' } {
    const diff = Math.abs(a - b);
    if (diff < 0.01) {
      return { matches: true, type: 'EXACT' };
    }
    // Tolerance: within 1% or within 1000 INR
    if (diff <= 1000 || diff / Math.max(a, b) <= 0.01) {
      return { matches: true, type: 'TOLERANCE' };
    }
    return { matches: false, type: 'NONE' };
  }

  /**
   * Scan an FDR against all existing instruments in the repository across institutions
   */
  async scanFdr(fdrId: string): Promise<DuplicateScanResult[]> {
    const target = await queryOne<any>(
      `SELECT f.*, i.name as institution_name, i.code as institution_code, d.document_hash
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       LEFT JOIN documents d ON f.id = d.fdr_id
       WHERE f.id = ?`,
      [fdrId]
    );

    if (!target) {
      return [];
    }

    // Retrieve all other active or non-archived instruments across all institutions
    const candidates = await query<any>(
      `SELECT f.*, i.name as institution_name, i.code as institution_code, d.document_hash
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       LEFT JOIN documents d ON f.id = d.fdr_id
       WHERE f.id != ? AND f.is_archived = 0`,
      [fdrId]
    );

    const results: DuplicateScanResult[] = [];
    const normTargetNumber = this.normalizeFdrNumber(target.fdr_number);
    const normTargetBank = this.normalizeBankName(target.bank_name);
    const normTargetBranch = this.normalizeBranch(target.branch_name);

    for (const cand of candidates) {
      const normCandNumber = this.normalizeFdrNumber(cand.fdr_number);
      const normCandBank = this.normalizeBankName(cand.bank_name);
      const normCandBranch = this.normalizeBranch(cand.branch_name);

      const matchingSignals: string[] = [];
      const matchedFields: MatchedFieldDetail[] = [];
      const differingFields: DifferingFieldDetail[] = [];

      let score = 0;
      let isExactCollision = false;
      let isBinaryHashMatch = false;

      // 1. Check Document Binary SHA-256 Hash
      if (target.document_hash && cand.document_hash && target.document_hash === cand.document_hash) {
        isBinaryHashMatch = true;
        matchingSignals.push('BINARY_CERTIFICATE_HASH_MATCH: Identical SHA-256 certificate payload');
        matchedFields.push({
          field: 'document_hash',
          fieldLabel: 'Certificate Binary Hash',
          targetValue: target.document_hash.substring(0, 16) + '...',
          candidateValue: cand.document_hash.substring(0, 16) + '...',
          matchType: 'EXACT'
        });
        score += 0.50;
      }

      // 2. FDR Number Comparison
      if (target.fdr_number === cand.fdr_number) {
        matchingSignals.push(`IDENTICAL_FDR_NUMBER: Exact match on '${target.fdr_number}'`);
        matchedFields.push({
          field: 'fdr_number',
          fieldLabel: 'FDR Number',
          targetValue: target.fdr_number,
          candidateValue: cand.fdr_number,
          matchType: 'EXACT'
        });
        score += 0.50;
      } else if (normTargetNumber && normCandNumber && normTargetNumber === normCandNumber) {
        matchingSignals.push(`NORMALIZED_FDR_NUMBER: Normalized identifier match '${normTargetNumber}'`);
        matchedFields.push({
          field: 'fdr_number',
          fieldLabel: 'FDR Number (Normalized)',
          targetValue: target.fdr_number,
          candidateValue: cand.fdr_number,
          matchType: 'NORMALIZED'
        });
        score += 0.45;
      } else if (
        normTargetNumber.length > 5 &&
        normCandNumber.length > 5 &&
        (normTargetNumber.includes(normCandNumber) || normCandNumber.includes(normTargetNumber))
      ) {
        matchingSignals.push(`PARTIAL_FDR_OVERLAP: Substring overlap '${target.fdr_number}' ~ '${cand.fdr_number}'`);
        matchedFields.push({
          field: 'fdr_number',
          fieldLabel: 'FDR Number (Partial Overlap)',
          targetValue: target.fdr_number,
          candidateValue: cand.fdr_number,
          matchType: 'NORMALIZED'
        });
        score += 0.20;
      } else {
        differingFields.push({
          field: 'fdr_number',
          fieldLabel: 'FDR Number',
          targetValue: target.fdr_number,
          candidateValue: cand.fdr_number
        });
      }

      // 3. Bank Name Comparison
      if (normTargetBank && normCandBank && normTargetBank === normCandBank) {
        matchingSignals.push(`NORMALIZED_BANK_MATCH: '${target.bank_name}' & '${cand.bank_name}' resolve to ${normTargetBank}`);
        matchedFields.push({
          field: 'bank_name',
          fieldLabel: 'Issuing Bank',
          targetValue: target.bank_name,
          candidateValue: cand.bank_name,
          matchType: target.bank_name.toLowerCase() === cand.bank_name.toLowerCase() ? 'EXACT' : 'NORMALIZED'
        });
        score += 0.20;
      } else {
        differingFields.push({
          field: 'bank_name',
          fieldLabel: 'Issuing Bank',
          targetValue: target.bank_name,
          candidateValue: cand.bank_name
        });
      }

      // 4. Branch Identifier Comparison
      if (normTargetBranch && normCandBranch && (normTargetBranch === normCandBranch || normTargetBranch.includes(normCandBranch) || normCandBranch.includes(normTargetBranch))) {
        matchingSignals.push(`BRANCH_MATCH: Similar branch location ('${target.branch_name}' ~ '${cand.branch_name}')`);
        matchedFields.push({
          field: 'branch_name',
          fieldLabel: 'Bank Branch',
          targetValue: target.branch_name,
          candidateValue: cand.branch_name,
          matchType: target.branch_name === cand.branch_name ? 'EXACT' : 'NORMALIZED'
        });
        score += 0.10;
      } else if (target.branch_name || cand.branch_name) {
        differingFields.push({
          field: 'branch_name',
          fieldLabel: 'Bank Branch',
          targetValue: target.branch_name || 'N/A',
          candidateValue: cand.branch_name || 'N/A'
        });
      }

      // 5. Amount Comparison
      const amtComp = this.compareAmounts(target.amount, cand.amount);
      if (amtComp.matches) {
        matchingSignals.push(
          amtComp.type === 'EXACT'
            ? `IDENTICAL_AMOUNT: Exact match of ₹${target.amount.toLocaleString('en-IN')}`
            : `AMOUNT_WITHIN_TOLERANCE: ₹${target.amount.toLocaleString('en-IN')} ~ ₹${cand.amount.toLocaleString('en-IN')}`
        );
        matchedFields.push({
          field: 'amount',
          fieldLabel: 'Principal Amount',
          targetValue: target.amount,
          candidateValue: cand.amount,
          matchType: amtComp.type === 'EXACT' ? 'EXACT' : 'TOLERANCE'
        });
        score += 0.15;
      } else {
        differingFields.push({
          field: 'amount',
          fieldLabel: 'Principal Amount',
          targetValue: target.amount,
          candidateValue: cand.amount
        });
      }

      // 6. Date Comparison (Maturity & Issue)
      const isMaturityMatch = target.maturity_date === cand.maturity_date;
      const isIssueMatch = target.issue_date === cand.issue_date;

      if (isMaturityMatch && isIssueMatch) {
        matchingSignals.push(`IDENTICAL_TERM_DATES: Issue ${target.issue_date} and Maturity ${target.maturity_date}`);
        matchedFields.push({
          field: 'term_dates',
          fieldLabel: 'Issue & Maturity Term',
          targetValue: `${target.issue_date} to ${target.maturity_date}`,
          candidateValue: `${cand.issue_date} to ${cand.maturity_date}`,
          matchType: 'EXACT'
        });
        score += 0.15;
      } else if (isMaturityMatch) {
        matchingSignals.push(`IDENTICAL_MATURITY_DATE: ${target.maturity_date}`);
        matchedFields.push({
          field: 'maturity_date',
          fieldLabel: 'Maturity Date',
          targetValue: target.maturity_date,
          candidateValue: cand.maturity_date,
          matchType: 'EXACT'
        });
        score += 0.10;
        differingFields.push({
          field: 'issue_date',
          fieldLabel: 'Issue Date',
          targetValue: target.issue_date,
          candidateValue: cand.issue_date
        });
      } else {
        differingFields.push({
          field: 'maturity_date',
          fieldLabel: 'Maturity Date',
          targetValue: target.maturity_date,
          candidateValue: cand.maturity_date
        });
      }

      // Determine Collision Severity
      if ((normTargetNumber === normCandNumber && normTargetBank === normCandBank) || isBinaryHashMatch) {
        isExactCollision = true;
      }

      let category: 'EXACT_DUPLICATE' | 'STRONG_POTENTIAL_MATCH' | 'WEAK_SIMILARITY' | 'NO_MATCH' = 'NO_MATCH';
      let reason = '';
      let recommendedAction = '';

      if (isExactCollision) {
        category = 'EXACT_DUPLICATE';
        score = 1.0;
        reason = `Cross-institution identifier collision detected between ${target.institution_name} (${target.institution_code}) and ${cand.institution_name} (${cand.institution_code}). Both records cite identical normalized instrument number (${target.fdr_number}) issued by ${target.bank_name}.`;
        recommendedAction = 'Place an administrative review hold on both instruments. Issue a formal clarification notice to both institutions and request an original bank branch verification certificate.';
      } else if (score >= 0.60) {
        category = 'STRONG_POTENTIAL_MATCH';
        reason = `Substantial multi-attribute similarity (${Math.round(score * 100)}% match score) detected across ${target.institution_name} and ${cand.institution_name}. Shared issuing bank, deposit value, or maturity terms require officer review to rule out duplicate submission or concurrent split deposits.`;
        recommendedAction = 'Perform side-by-side scrutiny of original uploaded certificates. Verify depositor title and branch seal before approving either case.';
      } else if (score >= 0.35 && (amtComp.matches || isMaturityMatch)) {
        category = 'WEAK_SIMILARITY';
        reason = `Attribute overlap detected (${matchedFields.map(m => m.fieldLabel).join(', ')}). May reflect standard regulatory prescribed security deposit figures at the same commercial bank branch.`;
        recommendedAction = 'No immediate hold required. Maintain routine scrutiny and verify depositor name against institution registration.';
      }

      if (category !== 'NO_MATCH') {
        results.push({
          matchCategory: category,
          similarityScore: Math.min(1.0, score),
          matchedFdrId: cand.id,
          matchedFdrNumber: cand.fdr_number,
          matchedInstitutionId: cand.institution_id,
          matchedInstitutionName: cand.institution_name,
          targetInstitutionName: target.institution_name,
          matchedFields,
          differingFields,
          matchingSignals,
          reason,
          recommendedAction
        });
      }
    }

    // Persist findings in duplicate_findings table
    for (const res of results) {
      if (!res.matchedFdrId) continue;

      const existing = await queryOne<any>(
        `SELECT id, status FROM duplicate_findings WHERE fdr_id = ? AND matched_fdr_id = ?`,
        [fdrId, res.matchedFdrId]
      );

      const signalsPayload = JSON.stringify({
        signals: res.matchingSignals,
        matchedFields: res.matchedFields,
        differingFields: res.differingFields,
        targetInstitutionName: res.targetInstitutionName,
        matchedInstitutionName: res.matchedInstitutionName,
        recommendedAction: res.recommendedAction
      });

      if (existing) {
        await run(
          `UPDATE duplicate_findings
           SET match_category = ?, similarity_score = ?, matching_signals = ?, reason = ?
           WHERE id = ?`,
          [res.matchCategory, res.similarityScore, signalsPayload, res.reason, existing.id]
        );
      } else {
        const findingId = `dup-${uuidv4()}`;
        const nowIso = new Date().toISOString();
        await run(
          `INSERT INTO duplicate_findings (
            id, fdr_id, matched_fdr_id, institution_id, matched_institution_id,
            match_category, similarity_score, matching_signals, reason, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
          [
            findingId,
            fdrId,
            res.matchedFdrId,
            target.institution_id,
            res.matchedInstitutionId,
            res.matchCategory,
            res.similarityScore,
            signalsPayload,
            res.reason,
            nowIso
          ]
        );
      }
    }

    return results;
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
