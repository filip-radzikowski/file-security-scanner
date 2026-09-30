import { eachDayOfInterval, endOfDay, format, isSameDay, startOfDay, subDays } from 'date-fns';
import { z } from 'zod';
import type { Entry } from '../../db/schema';

export const MOOD_ITEM_TYPE = 'mood';

/** JSON stored in extracted_items.payload for type "mood". */
export const moodPayloadSchema = z.object({
  score: z.number().int().min(1).max(5),
  words: z.array(z.string()).default([]),
  source: z.enum(['text', 'log']).default('text'),
});
export type MoodPayload = z.infer<typeof moodPayloadSchema>;

export const MOOD_LEVELS = [
  { score: 1, label: 'Low' },
  { score: 2, label: 'Down' },
  { score: 3, label: 'Okay' },
  { score: 4, label: 'Good' },
  { score: 5, label: 'Great' },
] as const;

export function moodLabel(score: number): string {
  return MOOD_LEVELS.find((l) => l.score === Math.round(score))?.label ?? 'Okay';
}

export interface MoodPoint {
  entryId: string;
  createdAt: number;
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
