import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class SQLiteStorage {
  private db: any;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  get(key: string) {
    const row = this.db.prepare('SELECT value FROM data WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  }

  set(key: string, value: any) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO data (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    stmt.run(key, JSON.stringify(value));
  }

  delete(key: string) {
    this.db.prepare('DELETE FROM data WHERE key = ?').run(key);
  }

  getAll() {
    return this.db.prepare('SELECT * FROM data').all().map((row: any) => ({
      key: row.key,
      value: JSON.parse(row.value),
      updatedAt: row.updated_at
    }));
  }
}

const GLOBAL_DB_PATH = path.join(process.cwd(), 'userdata', 'global.db');
export const globalDb = new SQLiteStorage(GLOBAL_DB_PATH);

export function getProjectDb(projectPath: string) {
  const dbPath = path.join(process.cwd(), projectPath, 'project.db');
  return new SQLiteStorage(dbPath);
}
