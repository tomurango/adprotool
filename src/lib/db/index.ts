import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH ?? './db/koukokuul.sqlite';
const resolvedPath = path.resolve(process.cwd(), dbPath);

// dbディレクトリが存在しない場合は作成
const dbDir = path.dirname(resolvedPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(resolvedPath);

// WALモードで高速化
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
