import { z } from 'zod';
import { getDb } from './database';
import {
  Entry,
  ExtractedItemRow,
  HealthDailyRow,
  ModuleRecord,
  Suggestion,
  SuggestionStatus,
  entryRowSchema,
  extractedItemRowSchema,
  healthDailyRowSchema,
  moduleRowSchema,
  suggestionRowSchema,
} from './schema';

/** Parses rows, dropping any that fail validation instead of crashing the app. */
function parseRows<T>(schema: z.ZodType<T>, rows: unknown[]): T[] {
  const out: T[] = [];
  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------- entries ----------

export async function insertEntry(entry: Entry): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO entries (id, text, createdAt, mood) VALUES (?, ?, ?, ?)', [
    entry.id,
    entry.text,
    entry.createdAt,
    entry.mood,
  ]);
}

export async function listEntries(): Promise<Entry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM entries ORDER BY createdAt ASC');
  return parseRows(entryRowSchema, rows);
}

// ---------- extracted items ----------

export async function insertExtractedItem(item: ExtractedItemRow): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO extracted_items (id, entryId, type, payload) VALUES (?, ?, ?, ?)', [
    item.id,
    item.entryId,
    item.type,
    item.payload,
  ]);
}

export async function listExtractedItems(): Promise<ExtractedItemRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM extracted_items');
  return parseRows(extractedItemRowSchema, rows);
}

export async function updateExtractedItemPayload(id: string, payload: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE extracted_items SET payload = ? WHERE id = ?', [payload, id]);
}

// ---------- modules ----------

export async function insertModule(m: ModuleRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO modules (id, type, title, x, y, addedAt, lastUsedAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [m.id, m.type, m.title, m.x, m.y, m.addedAt, m.lastUsedAt, m.status],
  );
}

export async function listModules(): Promise<ModuleRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM modules ORDER BY addedAt ASC');
  return parseRows(moduleRowSchema, rows);
}

export async function updateModulePosition(id: string, x: number, y: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE modules SET x = ?, y = ? WHERE id = ?', [x, y, id]);
}

export async function setModuleStatus(id: string, status: ModuleRecord['status']): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE modules SET status = ? WHERE id = ?', [status, id]);
}

export async function touchModule(id: string, at: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE modules SET lastUsedAt = ? WHERE id = ?', [at, id]);
}

// ---------- suggestions ----------

export async function listSuggestions(): Promise<Suggestion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM suggestions');
  return parseRows(suggestionRowSchema, rows);
}

export async function upsertSuggestion(s: Suggestion): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO suggestions (id, moduleType, reason, mentionCount, status) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET reason = excluded.reason, mentionCount = excluded.mentionCount, status = excluded.status`,
    [s.id, s.moduleType, s.reason, s.mentionCount, s.status],
  );
}

export async function setSuggestionStatus(id: string, status: SuggestionStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE suggestions SET status = ? WHERE id = ?', [status, id]);
}

// ---------- health (synced daily values) ----------

export async function upsertHealthDaily(rows: HealthDailyRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        `INSERT INTO health_daily (day, metric, value, source, updatedAt) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(day, metric) DO UPDATE SET value = excluded.value, source = excluded.source, updatedAt = excluded.updatedAt`,
        [r.day, r.metric, r.value, r.source, r.updatedAt],
      );
    }
  });
}

export async function listHealthDaily(): Promise<HealthDailyRow[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM health_daily');
  return parseRows(healthDailyRowSchema, rows);
}

export async function clearHealthDaily(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM health_daily');
}

// ---------- key/value (settings, last pan position) ----------

export async function getKv(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setKv(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

// ---------- maintenance ----------

export async function eraseAll(): Promise<void> {
  const db = await getDb();
  await db.execAsync(
    'DELETE FROM extracted_items; DELETE FROM entries; DELETE FROM modules; DELETE FROM suggestions; DELETE FROM health_daily; DELETE FROM kv;',
  );
}

/** Runs several writes as one unit. */
export async function inTransaction(task: () => Promise<void>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(task);
}
