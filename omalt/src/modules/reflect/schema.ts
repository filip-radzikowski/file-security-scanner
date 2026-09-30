import { eachDayOfInterval, endOfDay, format, isAfter, isSameDay, startOfDay, subDays } from 'date-fns';
import type { Entry } from '../../db/schema';
import { TaskItem } from '../todo/schema';

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
