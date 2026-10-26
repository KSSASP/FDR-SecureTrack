import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

let dbInstance: SqlJsDatabase | null = null;

function resolveDbPaths(): { dbDir: string; dbPath: string } {
  // Check common execution paths
  const candidates = [
    path.resolve(process.cwd(), 'server', 'data'),
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '..', 'server', 'data')
  ];

  for (const dir of candidates) {
    const file = path.resolve(dir, 'fdr_securetrack.db');
    if (fs.existsSync(file)) {
      return { dbDir: dir, dbPath: file };
    }
  }

  // Fallback: prefer server/data if server directory exists
  if (fs.existsSync(path.resolve(process.cwd(), 'server'))) {
    const dir = path.resolve(process.cwd(), 'server', 'data');
    return { dbDir: dir, dbPath: path.resolve(dir, 'fdr_securetrack.db') };
  }

  const dir = path.resolve(process.cwd(), 'data');
  return { dbDir: dir, dbPath: path.resolve(dir, 'fdr_securetrack.db') };
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const { dbDir, dbPath } = resolveDbPaths();

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const { dbDir, dbPath } = resolveDbPaths();
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  }
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
  saveDb();
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb();
  db.exec(sql);
  saveDb();
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  db.run('BEGIN TRANSACTION');
  try {
    const result = await fn();
    db.run('COMMIT');
    saveDb();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}
