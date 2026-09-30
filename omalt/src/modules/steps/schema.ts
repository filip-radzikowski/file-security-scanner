import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';
import { DatedValue, deriveDated, lastSevenDays } from '../daily';

export const STEPS_ITEM_TYPE = 'steps';
export const STEPS_GOAL = 8000;

export const stepsPayloadSchema = z.object({ count: z.number().int().min(0).max(200000).optional() });
export type StepsPayload = z.infer<typeof stepsPayloadSchema>;

export function deriveSteps(items: ExtractedItemRow[], entries: Entry[]): DatedValue<StepsPayload>[] {
  return deriveDated(STEPS_ITEM_TYPE, items, entries, (j) => {
    const p = stepsPayloadSchema.safeParse(j);
    return p.success ? p.data : null;
  });
}

/** Total steps per day for the last seven days (null when none were logged). */
export function weeklySteps(points: DatedValue<StepsPayload>[], now?: Date) {
  const slots = lastSevenDays(points, now);
  const totals = slots.map((s) => {
    const counts = s.values.map((v) => v.data.count).filter((c): c is number => c !== undefined);
    return counts.length ? counts.reduce((a, b) => a + b, 0) : null;
  });
  const logged = totals.filter((t): t is number => t !== null);
  return {
    slots,
    totals,
    today: totals[totals.length - 1] ?? null,
    average: logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : null,
  };
}

export function stepsSentence(count: number): string {
  return `Walked ${count} steps today.`;
}
