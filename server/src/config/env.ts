import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading .env from cwd, server/.env, or root
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(process.cwd(), '..', '.env')
];
for (const envFile of envCandidates) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    break;
  }
}

function resolveUploadDir(): string {
  const envDir = process.env.UPLOAD_DIR;
  if (envDir) {
    if (path.isAbsolute(envDir)) return envDir;
    return path.resolve(process.cwd(), envDir);
  }
  const candidates = [
    path.resolve(process.cwd(), 'server', 'uploads'),
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), '..', 'server', 'uploads')
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  if (fs.existsSync(path.resolve(process.cwd(), 'server'))) {
    return path.resolve(process.cwd(), 'server', 'uploads');
  }
  return path.resolve(process.cwd(), 'uploads');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fdr_securetrack_default_jwt_secret_dev_2026',
  uploadDir: resolveUploadDir(),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  enableSimulatedBankApi: process.env.ENABLE_SIMULATED_BANK_API !== 'false',
  aiProvider: process.env.AI_PROVIDER || 'local_deterministic',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  maturityReminderWindows: (process.env.MATURITY_REMINDER_WINDOWS || '90,60,30,15,7,1')
    .split(',')
    .map(w => parseInt(w.trim(), 10))
    .filter(n => !isNaN(n)),
  escalationOverdueDays: parseInt(process.env.ESCALATION_OVERDUE_DAYS || '14', 10)
};
