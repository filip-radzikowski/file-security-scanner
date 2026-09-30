import { differenceInCalendarDays, format, startOfDay, subDays } from 'date-fns';
import type { Entry } from '../../db/schema';

export interface StreakDay {
  date: Date;
  active: boolean;
  isToday: boolean;
}

export interface StreakInfo {
  current: number;
  best: number;
  /** Last 28 days, oldest first, ending today. */
  days: StreakDay[];
}

const key = (d: number | Date) => format(d, 'yyyy-MM-dd');

export function streakInfo(entries: Entry[], now: number): StreakInfo {
  const active = new Set(entries.map((e) => key(e.createdAt)));
  const today = startOfDay(now);

  // Current run counts back from today, or from yesterday if today has no entry yet.
  let cursor = active.has(key(today)) ? today : subDays(today, 1);
  let current = 0;
  while (active.has(key(cursor))) {
    current++;
    cursor = subDays(cursor, 1);
  }

  const sorted = [...active].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of sorted) {
    const d = new Date(`${k}T00:00:00`);
    run = prev && differenceInCalendarDays(d, prev) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  const days: StreakDay[] = [];
  for (let i = 27; i >= 0; i--) {
    const date = subDays(today, i);
    days.push({ date, active: active.has(key(date)), isToday: i === 0 });
  }
  return { current, best, days };
}
