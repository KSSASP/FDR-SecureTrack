import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, run } from '../db/database.js';
import { config } from '../config/env.js';

export class MaturityMonitoringService {
  async runMaturityScan(): Promise<{ alertsGenerated: number; casesEscalated: number }> {
    const now = new Date();
    const nowIso = now.toISOString();
    const reminderWindows = config.maturityReminderWindows; // [90, 60, 30, 15, 7, 1]
    let alertsGenerated = 0;
    let casesEscalated = 0;

    const fdrs = await query<any>(
      `SELECT f.*, i.name as institution_name
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       WHERE f.is_archived = 0 AND f.current_status NOT IN ('RELEASED', 'REJECTED')`
    );

    for (const f of fdrs) {
      const maturity = new Date(f.maturity_date);
      const diffDays = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const isMatured = diffDays <= 0;
      const overdueDays = isMatured ? Math.abs(diffDays) : 0;

      // Update instrument status if matured and not already marked
      if (isMatured && f.current_status !== 'MATURED' && f.current_status !== 'REPLACED' && f.current_status !== 'RELEASE_REQUESTED') {
        await run(`UPDATE fdr_instruments SET current_status = 'MATURED', updated_at = ? WHERE id = ?`, [nowIso, f.id]);
      }

      // 1. Approaching Maturity Alerts (Check each window)
      if (!isMatured) {
        for (const window of reminderWindows) {
          // If instrument is currently within this reminder window
          if (diffDays <= window && diffDays > (window > 1 ? window / 2 : 0)) {
            const reminderTag = `WINDOW_${window}D`;
            // Check if notification already generated for this window
            const existingNotif = await queryOne(
              `SELECT id FROM notifications
               WHERE fdr_id = ? AND event_type = 'APPROACHING_MATURITY' AND message LIKE ?`,
              [f.id, `%${reminderTag}%`]
            );

            if (!existingNotif) {
              const priority = window <= 7 ? 'URGENT' : window <= 30 ? 'NORMAL' : 'LOW';
              const notifId = `notif-${uuidv4()}`;
              await run(
                `INSERT INTO notifications (
                  id, event_type, fdr_id, institution_id, title, message, priority,
                  target_role, target_user_id, is_read, is_escalated, created_at
                ) VALUES (?, 'APPROACHING_MATURITY', ?, ?, ?, ?, ?, 'REGULATION_OFFICER', ?, 0, 0, ?)`,
                [
                  notifId,
                  f.id,
                  f.institution_id,
                  `Maturity Advisory [${reminderTag}]: ${f.bank_name}`,
                  `Instrument ${f.fdr_number} (₹${f.amount.toLocaleString('en-IN')}) of ${f.institution_name} will mature in ${diffDays} day(s) on ${f.maturity_date}. [${reminderTag}]`,
                  priority,
                  f.assigned_officer_id || null,
                  nowIso
                ]
              );
              alertsGenerated++;
            }
          }
        }
      }

      // 2. Overdue Escalation Check
      if (isMatured && overdueDays >= config.escalationOverdueDays) {
        const escalationTag = `OVERDUE_${config.escalationOverdueDays}D`;
        const existingEscalation = await queryOne(
          `SELECT id FROM notifications
           WHERE fdr_id = ? AND event_type = 'ESCALATED_UNRESOLVED' AND message LIKE ?`,
          [f.id, `%${escalationTag}%`]
        );

        if (!existingEscalation) {
          const escId = `esc-${uuidv4()}`;
          await run(
            `INSERT INTO notifications (
              id, event_type, fdr_id, institution_id, title, message, priority,
              target_role, target_user_id, is_read, is_escalated, created_at
            ) VALUES (?, 'ESCALATED_UNRESOLVED', ?, ?, ?, ?, 'CRITICAL', 'SUPER_ADMIN', null, 0, 1, ?)`,
            [
              escId,
              f.id,
              f.institution_id,
              `ESCALATION: Overdue FDR Unresolved for ${overdueDays} Days`,
              `FDR ${f.fdr_number} belonging to ${f.institution_name} is overdue by ${overdueDays} days without replacement or refund approval. Escalated to Super Admin for regulatory intervention. [${escalationTag}]`,
              nowIso
            ]
          );
          casesEscalated++;
        }
      }
    }

    return { alertsGenerated, casesEscalated };
  }

  async getMaturitySummary() {
    const now = new Date();
    const fdrs = await query<any>(
      `SELECT f.*, i.name as institution_name
       FROM fdr_instruments f
       JOIN institutions i ON f.institution_id = i.id
       WHERE f.is_archived = 0
       ORDER BY f.maturity_date ASC`
    );

    const maturing30Days: any[] = [];
    const maturing60Days: any[] = [];
    const maturing90Days: any[] = [];
    const alreadyMatured: any[] = [];
    const overdueRenewals: any[] = [];

    for (const f of fdrs) {
      const maturity = new Date(f.maturity_date);
      const diffDays = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 3600 * 24));
      const record = { ...f, daysToMaturity: diffDays };

      if (diffDays < 0) {
        alreadyMatured.push(record);
        if (f.renewal_status !== 'REPLACEMENT_ACCEPTED' && f.current_status !== 'RELEASED') {
          overdueRenewals.push(record);
        }
      } else if (diffDays <= 30) {
        maturing30Days.push(record);
      } else if (diffDays <= 60) {
        maturing60Days.push(record);
      } else if (diffDays <= 90) {
        maturing90Days.push(record);
      }
    }

    return {
      maturing30Days,
      maturing60Days,
      maturing90Days,
      alreadyMatured,
      overdueRenewals
    };
  }
}

export const maturityMonitoringService = new MaturityMonitoringService();
