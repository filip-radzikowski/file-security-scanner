import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';

const DB_NAME = 'omalt.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Opens (once) and migrates the database. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current < SCHEMA_VERSION) {
    await db.execAsync(CREATE_TABLES_SQL);
    if (current === 1) {
      // v1 stored mood as 1-5; v2 stores 0-100. Map each level to the middle of its band.
      await db.execAsync('UPDATE entries SET mood = mood * 20 - 10 WHERE mood BETWEEN 1 AND 5');
    }
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  return db;
}
