import bcrypt from 'bcryptjs';
import { getDb, queryOne, exec, run, saveDb } from './database.js';
import { SCHEMA_SQL } from './schemaSql.js';
import { seedDatabase } from './seed.js';
import { pdfGeneratorService } from '../services/pdfGeneratorService.js';

export async function ensureDatabaseInitialized(): Promise<void> {
  await getDb();

  // 1. Check if the schema tables exist
  const checkTable = await queryOne<any>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
  );

  let needsSeed = false;

  if (!checkTable) {
    console.log('[DB-INIT] Users table not found. Creating database schema from SCHEMA_SQL...');
    await exec(SCHEMA_SQL);
    needsSeed = true;
  } else {
    // Check if any users exist
    const userCountRes = await queryOne<any>(`SELECT COUNT(*) as count FROM users`);
    const count = userCountRes ? Number(userCountRes.count) : 0;
    if (count === 0) {
      console.log('[DB-INIT] Database schema exists but no users found. Running initial seed...');
      needsSeed = true;
    } else {
      console.log(`[DB-INIT] Existing persistent database verified with ${count} users. Preserving records.`);
    }
  }

  if (needsSeed) {
    console.log('[DB-INIT] Populating initial demonstration repository...');
    await seedDatabase();
  }

  // 2. If INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are provided, ensure custom admin exists
  const customAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim();
  const customAdminPassword = (process.env.INITIAL_ADMIN_PASSWORD || '').trim();
  if (customAdminEmail && customAdminPassword) {
    const existingAdmin = await queryOne<any>(`SELECT id FROM users WHERE email = ?`, [customAdminEmail]);
    const hash = await bcrypt.hash(customAdminPassword, 10);
    const nowIso = new Date().toISOString();
    if (existingAdmin) {
      await run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [hash, nowIso, existingAdmin.id]);
      console.log(`[DB-INIT] Updated initial Super Administrator credentials for: ${customAdminEmail}`);
    } else {
      const adminId = 'usr-admin-custom';
      await run(
        `INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'System Administrator', 'SUPER_ADMIN', 'ACTIVE', ?, ?)`,
        [adminId, customAdminEmail, hash, nowIso, nowIso]
      );
      console.log(`[DB-INIT] Created initial Super Administrator: ${customAdminEmail}`);
    }
  }

  // 3. Ensure synthetic document PDFs exist on disk
  const preloadedCount = await pdfGeneratorService.ensureSeededDocumentsExist();
  if (preloadedCount > 0) {
    console.log(`[DB-INIT] Verified ${preloadedCount} synthetic FDR documents on disk.`);
  }

  saveDb();
}
