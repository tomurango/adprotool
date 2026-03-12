import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './index';
import path from 'path';

migrate(db, { migrationsFolder: path.resolve(__dirname, './migrations') });
console.log('Migration completed');
