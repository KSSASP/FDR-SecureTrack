import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

// 1. Dashboard Metrics and Charts Dataset
router.get('/dashboard', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const isInstAdmin = user.role === 'INSTITUTION_ADMIN';
    const scopeSql = isInstAdmin ? ` AND institution_id = '${user.institution_id}'` : '';
    const nowIso = new Date().toISOString().split('T')[0];

    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30DaysIso = in30Days.toISOString().split('T')[0];

    // Summary Metrics
    const totalFdrs = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 ${scopeSql}`);
    const activeFdrs = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 AND current_status IN ('VERIFIED', 'SUBMITTED', 'PENDING_VERIFICATION') ${scopeSql}`);
    const maturing30 = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 AND maturity_date >= ? AND maturity_date <= ? ${scopeSql}`, [nowIso, in30DaysIso]);
    const maturedCount = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 AND maturity_date < ? AND current_status != 'RELEASED' ${scopeSql}`, [nowIso]);
    const pendingVerif = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 AND (current_status IN ('SUBMITTED', 'PENDING_VERIFICATION') OR verification_status = 'PENDING') ${scopeSql}`);
    const highRiskCount = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM fdr_instruments WHERE is_archived = 0 AND risk_score >= 60 ${scopeSql}`);
    const discrepanciesCount = await queryOne<{ c: number }>(`
      SELECT COUNT(DISTINCT fdr_id) as c
      FROM verification_records
      WHERE resolution_status = 'UNRESOLVED' AND status IN ('WARNING', 'DEFICIENT')
      ${isInstAdmin ? ` AND fdr_id IN (SELECT id FROM fdr_instruments WHERE institution_id = '${user.institution_id}')` : ''}
    `);
    const pendingRenewals = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM renewal_requests WHERE status = 'PENDING_REVIEW' ${isInstAdmin ? ` AND institution_id = '${user.institution_id}'` : ''}`);
    const pendingReleases = await queryOne<{ c: number }>(`SELECT COUNT(*) as c FROM release_requests WHERE status IN ('SUBMITTED', 'UNDER_REVIEW', 'AWAITING_COMPETENT_AUTHORITY') ${isInstAdmin ? ` AND institution_id = '${user.institution_id}'` : ''}`);

    // Total Amount Secured
    const totalSecured = await queryOne<{ s: number }>(`SELECT SUM(amount) as s FROM fdr_instruments WHERE is_archived = 0 AND current_status NOT IN ('RELEASED', 'REJECTED') ${scopeSql}`);

    // Status Distribution
    const statusDist = await query<any>(`
      SELECT current_status as status, COUNT(*) as count
      FROM fdr_instruments
      WHERE is_archived = 0 ${scopeSql}
      GROUP BY current_status
    `);

    // Bank Distribution
    const bankDist = await query<any>(`
      SELECT bank_name as name, COUNT(*) as count, SUM(amount) as total_amount
      FROM fdr_instruments
      WHERE is_archived = 0 ${scopeSql}
      GROUP BY bank_name
      ORDER BY count DESC
      LIMIT 8
    `);

    // Risk Level Distribution
    const riskDist = await query<any>(`
      SELECT risk_level as level, COUNT(*) as count
      FROM fdr_instruments
      WHERE is_archived = 0 ${scopeSql}
      GROUP BY risk_level
    `);

    // Institution Distribution (Top 6)
    const instDist = await query<any>(`
      SELECT i.name as institution, COUNT(f.id) as count, SUM(f.amount) as total_amount
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      WHERE f.is_archived = 0 ${scopeSql}
      GROUP BY i.id
      ORDER BY total_amount DESC
      LIMIT 6
    `);

    // Submissions List for Dashboard
    const recentSubmissions = await query<any>(`
      SELECT f.*, i.name as institution_name
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      WHERE f.is_archived = 0 ${scopeSql}
      ORDER BY f.created_at DESC
      LIMIT 25
    `);

    res.json({
      metrics: {
        totalInstruments: totalFdrs?.c || 0,
        activeInstruments: activeFdrs?.c || 0,
        maturingWithin30Days: maturing30?.c || 0,
        alreadyMatured: maturedCount?.c || 0,
        pendingVerification: pendingVerif?.c || 0,
        recordsWithDiscrepancies: Math.max(discrepanciesCount?.c || 0, highRiskCount?.c || 0),
        highRiskCases: highRiskCount?.c || 0,
        pendingRenewals: pendingRenewals?.c || 0,
        pendingReleases: pendingReleases?.c || 0,
        totalSecuredAmount: totalSecured?.s || 0
      },
      charts: {
        statusDistribution: statusDist,
        bankDistribution: bankDist,
        riskDistribution: riskDist,
        institutionDistribution: instDist
      },
      recentSubmissions
    });
  } catch (err: any) {
    console.error('Dashboard metrics error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

// 2. Export Real Database Records to CSV
router.get('/export-csv', authenticateToken, requireRole(['SUPER_ADMIN', 'REGULATION_OFFICER']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, bankName, institutionId, startDate, endDate } = req.query as Record<string, string>;

    let whereClauses = ['f.is_archived = 0'];
    const params: any[] = [];

    if (status) {
      whereClauses.push('f.current_status = ?');
      params.push(status);
    }
    if (bankName) {
      whereClauses.push('f.bank_name = ?');
      params.push(bankName);
    }
    if (institutionId) {
      whereClauses.push('f.institution_id = ?');
      params.push(institutionId);
    }
    if (startDate) {
      whereClauses.push('f.maturity_date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereClauses.push('f.maturity_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const rows = await query<any>(`
      SELECT f.id, f.fdr_number, i.name as institution_name, i.code as institution_code,
             f.bank_name, f.branch_name, f.amount, f.currency, f.deposit_type,
             f.issue_date, f.maturity_date, f.interest_rate, f.current_status,
             f.verification_status, f.risk_score, f.risk_level, f.linked_application_ref
      FROM fdr_instruments f
      JOIN institutions i ON f.institution_id = i.id
      ${whereSql}
      ORDER BY f.maturity_date ASC
    `, params);

    // Build CSV
    const headers = [
      'Internal ID', 'FDR Number', 'Institution Code', 'Institution Name',
      'Issuing Bank', 'Branch', 'Amount (INR)', 'Deposit Type',
      'Issue Date', 'Maturity Date', 'Interest Rate (%)', 'Current Status',
      'Verification Status', 'Risk Score', 'Risk Level', 'Application Ref'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Protect against CSV / Spreadsheet formula injection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    let csv = headers.join(',') + '\n';
    for (const r of rows) {
      const line = [
        escapeCsv(r.id),
        escapeCsv(r.fdr_number),
        escapeCsv(r.institution_code),
        escapeCsv(r.institution_name),
        escapeCsv(r.bank_name),
        escapeCsv(r.branch_name),
        escapeCsv(r.amount),
        escapeCsv(r.deposit_type),
        escapeCsv(r.issue_date),
        escapeCsv(r.maturity_date),
        escapeCsv(r.interest_rate || 'N/A'),
        escapeCsv(r.current_status),
        escapeCsv(r.verification_status),
        escapeCsv(r.risk_score),
        escapeCsv(r.risk_level),
        escapeCsv(r.linked_application_ref)
      ];
      csv += line.join(',') + '\n';
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="FDR_SecureTrack_Export_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err: any) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'Failed to export CSV report' });
  }
});

export default router;
