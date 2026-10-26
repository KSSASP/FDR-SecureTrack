import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { run } from '../db/database.js';

export interface AuditLogParams {
  userId?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  institutionId?: string | null;
  beforeState?: any;
  afterState?: any;
  decisionReason?: string | null;
  ipAddress?: string;
}

export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const id = `aud-${uuidv4()}`;
    const nowIso = new Date().toISOString();

    // Sanitize beforeState and afterState to remove sensitive keys
    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const copy = { ...obj };
      delete copy.password;
      delete copy.password_hash;
      delete copy.token;
      delete copy.jwt;
      return copy;
    };

    const beforeJson = params.beforeState ? JSON.stringify(sanitize(params.beforeState)) : null;
    const afterJson = params.afterState ? JSON.stringify(sanitize(params.afterState)) : null;

    await run(
      `INSERT INTO audit_events (
        id, user_id, user_name, user_role, action, entity_type, entity_id,
        institution_id, before_state, after_state, decision_reason, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        params.userId || null,
        params.userName,
        params.userRole,
        params.action,
        params.entityType,
        params.entityId,
        params.institutionId || null,
        beforeJson,
        afterJson,
        params.decisionReason || null,
        params.ipAddress || '127.0.0.1',
        nowIso
      ]
    );
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}

export function auditFromRequest(req: Request, params: Omit<AuditLogParams, 'userId' | 'userName' | 'userRole' | 'ipAddress'>): Promise<void> {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  return logAuditEvent({
    userId: req.user?.id || null,
    userName: req.user?.name || 'Anonymous User',
    userRole: req.user?.role || 'UNAUTHENTICATED',
    ipAddress: ip,
    ...params
  });
}
