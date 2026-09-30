import {
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isSameDay,
  startOfDay,
  subDays,
} from 'date-fns';
import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';
import { TaskItem } from '../todo/schema';

export const REFLECTION_ITEM_TYPE = 'reflection';

/** JSON stored in extracted_items.payload for type "reflection". The text itself is the entry. */
export const reflectionPayloadSchema = z.object({
  prompt: z.string().min(1).max(300),
  /** Optional overall rating for the period, 0-100. */
  rating: z.number().min(0).max(100).optional(),
});
export type ReflectionPayload = z.infer<typeof reflectionPayloadSchema>;

export interface SavedReflection {
  entryId: string;
  createdAt: number;
  text: string;
  prompt: string;
  rating?: number;
}

/** Saved reflections, newest first. */
export function deriveReflections(items: ExtractedItemRow[], entries: Entry[]): SavedReflection[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const out: SavedReflection[] = [];
  for (const item of items) {
    if (item.type !== REFLECTION_ITEM_TYPE || !item.entryId) continue;
    const entry = byId.get(item.entryId);
    if (!entry) continue;
    try {
      const p = reflectionPayloadSchema.safeParse(JSON.parse(item.payload));
      if (p.success) {
        out.push({ entryId: entry.id, createdAt: entry.createdAt, text: entry.text, prompt: p.data.prompt, rating: p.data.rating });
      }
    } catch {
      // skip malformed payloads
    }
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** Calendar weeks (Monday start) in a row with at least one reflection, ending this week or last week. */
export function weeksInARow(reflections: SavedReflection[], now: Date): number {
  const weeks = new Set(reflections.map((r) => differenceInCalendarWeeks(now, r.createdAt, { weekStartsOn: 1 })));
  let start = weeks.has(0) ? 0 : weeks.has(1) ? 1 : -1;
  if (start < 0) return 0;
  let n = 0;
  while (weeks.has(start + n)) n++;
  return n;
}

export function reflectedThisWeek(reflections: SavedReflection[], now: Date): boolean {
  return reflections.some((r) => differenceInCalendarWeeks(now, r.createdAt, { weekStartsOn: 1 }) === 0);
}

/** What the user has chosen for their Reflect tab. */
export const reflectPrefsSchema = z.object({
  /** Theme ids from PROMPT_THEMES. */
  themes: z.array(z.string()),
  /** The user's own prompts. */
  custom: z.array(z.string().min(1).max(200)).max(12),
});
export type ReflectPrefs = z.infer<typeof reflectPrefsSchema>;

export const DEFAULT_REFLECT_PREFS: ReflectPrefs = { themes: ['wins', 'gratitude', 'challenges', 'growth'], custom: [] };

export interface WeekDay {
  date: Date;
  label: string;
  hasEntry: boolean;
  isToday: boolean;
}

export interface WeekSummary {
  entryCount: number;
  activeDays: number;
  days: WeekDay[];
  moodAverage: number | null;
  tasksDone: number;
  latest: Entry[];
}

/** Summary of the last seven days (today included). */
export function weekSummary(entries: Entry[], tasks: TaskItem[], now: number): WeekSummary {
  const start = subDays(startOfDay(now), 6);
  const inWeek = entries.filter((e) => e.createdAt >= start.getTime() && e.createdAt <= endOfDay(now).getTime());
  const days = eachDayOfInterval({ start, end: endOfDay(now) }).map((date) => ({
    date,
    label: format(date, 'EEE'),
    hasEntry: inWeek.some((e) => isSameDay(e.createdAt, date)),
    isToday: isSameDay(date, now),
  }));
  const moods = inWeek.filter((e) => e.mood !== null).map((e) => e.mood as number);
  return {
    entryCount: inWeek.length,
    activeDays: days.filter((d) => d.hasEntry).length,
    days,
    moodAverage: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
    tasksDone: tasks.filter((t) => t.done && t.doneAt !== undefined && isAfter(t.doneAt, start)).length,
    latest: inWeek.slice(-3).reverse(),
  };
}
