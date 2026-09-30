import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';
import type { HealthDailyMap } from '../../health';
import { DatedValue, WeekSlot, deriveDated, lastSevenDays } from '../daily';

export const SLEEP_ITEM_TYPE = 'sleep';
export const SLEEP_TARGET_HOURS = 8;

export const sleepPayloadSchema = z.object({ hours: z.number().min(0).max(16).optional() });
export type SleepPayload = z.infer<typeof sleepPayloadSchema>;

export function deriveSleep(items: ExtractedItemRow[], entries: Entry[]): DatedValue<SleepPayload>[] {
  return deriveDated(SLEEP_ITEM_TYPE, items, entries, (j) => {
    const p = sleepPayloadSchema.safeParse(j);
    return p.success ? p.data : null;
  });
}

/** Hours for a day: the latest value logged that day, or null. */
export function hoursForDay(slot: WeekSlot<SleepPayload>): number | null {
  for (let i = slot.values.length - 1; i >= 0; i--) {
    const h = slot.values[i].data.hours;
    if (h !== undefined) return h;
  }
  return null;
}

/** Synced hours win over typed ones for a day. */
export function weeklySleep(points: DatedValue<SleepPayload>[], now?: Date, health: HealthDailyMap = {}) {
  const slots = lastSevenDays(points, now);
  const hours = slots.map((s) => health[s.key]?.sleepHours ?? hoursForDay(s));
  const logged = hours.filter((h): h is number => h !== null);
  return {
    slots,
    hours,
    average: logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null,
    lastNight: [...hours].reverse().find((h): h is number => h !== null) ?? null,
  };
}

export function formatHours(h: number): string {
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

export function sleepSentence(hours: number): string {
  return `Slept ${hours} hours last night.`;
}
