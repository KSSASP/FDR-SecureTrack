import { Router, Request, Response } from 'express';
import { query, run } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { auditFromRequest } from '../services/auditService.js';
import { config } from '../config/env.js';

const router = Router();

// 1. Get System Configuration and Integration Status (No sensitive secrets exposed)
router.get('/system', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const configs = await query<any>(`SELECT key, value, description, updated_at, updated_by FROM system_configs`);

    const integrations = [
      {
        id: 'bank-gateway',
        name: 'Interbank Core Verification Switch (SFMS / API Adapter)',
        category: 'FINANCIAL_GATEWAY',
        provider: 'SimulatedCoreBankingGateway-v2.1',
        status: config.enableSimulatedBankApi ? 'DEMO_CONNECTED' : 'DISCONNECTED',
        isSimulated: true,
        lastHeartbeat: new Date().toISOString(),
        details: 'Simulated multi-bank adapter enabled. Clearly isolates demo confirmation from live banking networks.'
      },
      {
        id: 'pdf-ocr-engine',
        name: 'Digital Instrument OCR & Text Parser',
        category: 'DOCUMENT_PROCESSING',
        provider: 'pdf-parse + Regex Heuristic Engine',
        status: 'CONNECTED',
        isSimulated: false,
        lastHeartbeat: new Date().toISOString(),
        details: 'Local deterministic extraction service. Extracts FDR serials, banks, dates, and amounts without third-party cloud leaks.'
      },
      {
        id: 'tampering-ai',
        name: 'AI Document Alteration & Discrepancy Analyzer',
        category: 'AI_INTEGRITY',
        provider: config.aiProvider === 'local_deterministic' ? 'Local Deterministic Rules Engine' : 'External LLM Adapter',
        status: 'CONNECTED',
        isSimulated: false,
        lastHeartbeat: new Date().toISOString(),
        details: 'Cross-compares certified document fields against electronic submissions to identify numerical and chronological discrepancies.'
      },
      {
        id: 'notification-dispatch',
        name: 'Automated Regulatory Advisory Dispatcher',
        category: 'MESSAGING',
        provider: 'In-App Operational Notification Broker',
        status: 'CONNECTED',
        isSimulated: false,
        lastHeartbeat: new Date().toISOString(),
        details: 'Deduplicated in-app notification engine with multi-role routing and supervisory escalation.'
      },
      {
        id: 'secure-vault',
        name: 'Encrypted Repository Vault',
        category: 'STORAGE',
        provider: 'Local Protected FS (Non-Public Static Directory)',
        status: 'CONNECTED',
        isSimulated: false,
        lastHeartbeat: new Date().toISOString(),
        details: 'File uploads stored with cryptographically generated identifiers outside static web roots with SHA-256 binary validation.'
      }
    ];

    res.json({
      configs,
      integrations,
      environment: {
        nodeEnv: config.nodeEnv,
        uploadDir: config.uploadDir,
        maxFileSizeMb: config.maxFileSizeMb,
        reminderWindows: config.maturityReminderWindows,
        escalationOverdueDays: config.escalationOverdueDays
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve system configurations' });
  }
});

// 2. Update System Configuration (Super Admin only)
router.put('/system', authenticateToken, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      res.status(400).json({ error: 'Config key and value are required' });
      return;
    }

    const nowIso = new Date().toISOString();
    await run(
      `UPDATE system_configs SET value = ?, updated_at = ?, updated_by = ? WHERE key = ?`,
      [value.toString(), nowIso, req.user!.name, key]
    );

    await auditFromRequest(req, {
      action: 'SYSTEM_CONFIG_UPDATE',
      entityType: 'SYSTEM_CONFIG',
      entityId: key,
      decisionReason: `Super Admin updated system parameter ${key} to ${value}`
    });

    res.json({ message: `System configuration ${key} updated successfully` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update system configuration' });
  }
});

export default router;
