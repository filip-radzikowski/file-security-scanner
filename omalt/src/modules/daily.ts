import { eachDayOfInterval, endOfDay, format, isSameDay, startOfDay, subDays } from 'date-fns';
import type { Entry, ExtractedItemRow } from '../db/schema';

export interface DatedValue<T> {
  entryId: string;
  createdAt: number;
  data: T;
}

/** Reads every extracted item of `type`, validating the payload and dating it by its entry. */
export function deriveDated<T>(
  type: string,
  items: ExtractedItemRow[],
  entries: Entry[],
  parse: (json: unknown) => T | null,
): DatedValue<T>[] {
  const when = new Map(entries.map((e) => [e.id, e.createdAt]));
  const out: DatedValue<T>[] = [];
  for (const item of items) {
    if (item.type !== type || !item.entryId) continue;
    const createdAt = when.get(item.entryId);
    if (createdAt === undefined) continue;
    try {
      const data = parse(JSON.parse(item.payload));
      if (data !== null) out.push({ entryId: item.entryId, createdAt, data });
    } catch {
      // skip malformed payloads
    }
  }
  return out.sort((a, b) => a.createdAt - b.createdAt);
}

export interface WeekSlot<T> {
  key: string;
  date: Date;
  label: string;
  isToday: boolean;
  values: DatedValue<T>[];
}

/** Buckets values into the last seven days, oldest first. */
export function lastSevenDays<T>(points: DatedValue<T>[], now: Date = new Date()): WeekSlot<T>[] {
  return eachDayOfInterval({ start: subDays(startOfDay(now), 6), end: endOfDay(now) }).map((date) => ({
    key: format(date, 'yyyy-MM-dd'),
    date,
    label: format(date, 'EEE'),
    isToday: isSameDay(date, now),
    values: points.filter((p) => isSameDay(p.createdAt, date)),
  }));
}
