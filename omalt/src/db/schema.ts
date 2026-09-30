import { z } from 'zod';

/** SQL for the local-first store. Bump SCHEMA_VERSION and add a migration step when it changes. */
export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  mood INTEGER
);
CREATE INDEX IF NOT EXISTS idx_entries_createdAt ON entries (createdAt);

CREATE TABLE IF NOT EXISTS extracted_items (
  id TEXT PRIMARY KEY NOT NULL,
  entryId TEXT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  FOREIGN KEY (entryId) REFERENCES entries (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_items_type ON extracted_items (type);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  addedAt INTEGER NOT NULL,
  lastUsedAt INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS suggestions (
  id TEXT PRIMARY KEY NOT NULL,
  moduleType TEXT NOT NULL,
  reason TEXT NOT NULL,
  mentionCount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export const entryRowSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.number(),
  mood: z.number().int().min(1).max(5).nullable(),
});
export type Entry = z.infer<typeof entryRowSchema>;

export const extractedItemRowSchema = z.object({
  id: z.string(),
  entryId: z.string().nullable(),
  type: z.string(),
  payload: z.string(),
});
export type ExtractedItemRow = z.infer<typeof extractedItemRowSchema>;

export const moduleStatusSchema = z.enum(['active', 'resting']);

export const moduleRowSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  addedAt: z.number(),
  lastUsedAt: z.number(),
  status: moduleStatusSchema.catch('active'),
});
export type ModuleRecord = z.infer<typeof moduleRowSchema>;

export const suggestionStatusSchema = z.enum(['pending', 'accepted', 'dismissed']);
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;

export const suggestionRowSchema = z.object({
  id: z.string(),
  moduleType: z.string(),
  reason: z.string(),
  mentionCount: z.number().int(),
  status: suggestionStatusSchema.catch('pending'),
});
export type Suggestion = z.infer<typeof suggestionRowSchema>;
