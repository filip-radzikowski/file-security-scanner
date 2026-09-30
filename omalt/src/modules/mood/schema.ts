import { eachDayOfInterval, endOfDay, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { z } from 'zod';
import type { Entry } from '../../db/schema';

export const MOOD_ITEM_TYPE = 'mood';

/** JSON stored in extracted_items.payload for type "mood". */
export const moodPayloadSchema = z.object({
  /** Coarse level 1-5 (what the keyword rules detect). */
  score: z.number().int().min(1).max(5),
  /** Precise feeling 0-100, present when it came from the slider. */
  value: z.number().min(0).max(100).optional(),
  words: z.array(z.string()).default([]),
  source: z.enum(['text', 'log']).default('text'),
});
export type MoodPayload = z.infer<typeof moodPayloadSchema>;

/** Five named bands across the 0-100 scale. `value` is the middle of each band. */
export const MOOD_LEVELS = [
  { score: 1, label: 'Low', value: 10 },
  { score: 2, label: 'Down', value: 30 },
  { score: 3, label: 'Okay', value: 50 },
  { score: 4, label: 'Good', value: 70 },
  { score: 5, label: 'Great', value: 90 },
] as const;

/** 0..4 band index for a 0-100 value. */
export function moodIndex(value: number): number {
  return Math.min(4, Math.max(0, Math.floor(value / 20)));
}

export function moodLabel(value: number): string {
  return MOOD_LEVELS[moodIndex(value)].label;
}

/** Converts a coarse 1-5 level to a 0-100 value. */
export function valueForLevel(score: number): number {
  return MOOD_LEVELS[Math.min(4, Math.max(0, score - 1))].value;
}

export interface MoodPoint {
  entryId: string;
  createdAt: number;
  /** 0-100 */
  score: number;
}

export function deriveMoods(entries: Entry[]): MoodPoint[] {
  const points: MoodPoint[] = [];
  for (const e of entries) {
    if (e.mood !== null) points.push({ entryId: e.id, createdAt: e.createdAt, score: e.mood });
  }
  return points;
}

export interface DayMood {
  date: Date;
  label: string;
  /** Average score for the day, or null if nothing was logged. */
  average: number | null;
  isToday: boolean;
}

/** The last seven days, oldest first, ending today. */
export function weeklyMood(points: MoodPoint[], now: Date = new Date()): DayMood[] {
  const days = eachDayOfInterval({ start: subDays(startOfDay(now), 6), end: endOfDay(now) });
  return days.map((date) => {
    const scores = points.filter((p) => isSameDay(p.createdAt, date)).map((p) => p.score);
    return {
      date,
      label: format(date, 'EEE'),
      average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      isToday: isSameDay(date, now),
    };
  });
}

export function weeklyAverage(days: DayMood[]): number | null {
  const values = days.filter((d) => d.average !== null).map((d) => d.average as number);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Most recent score logged today, if any. */
export function todaysMood(points: MoodPoint[], now: Date = new Date()): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (isSameDay(points[i].createdAt, now)) return points[i].score;
  }
  return null;
}
