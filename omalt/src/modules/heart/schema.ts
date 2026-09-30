import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';
import { DatedValue, deriveDated } from '../daily';

export const HEART_ITEM_TYPE = 'heart';

export const heartPayloadSchema = z.object({ bpm: z.number().int().min(30).max(220).optional() });
export type HeartPayload = z.infer<typeof heartPayloadSchema>;

export function deriveHeart(items: ExtractedItemRow[], entries: Entry[]): DatedValue<HeartPayload>[] {
  return deriveDated(HEART_ITEM_TYPE, items, entries, (j) => {
    const p = heartPayloadSchema.safeParse(j);
    return p.success ? p.data : null;
  });
}

/** Milliseconds per beat, clamped so the pulse never gets frantic or sleepy. */
export function pulseMs(bpm: number): number {
  return 60000 / Math.min(180, Math.max(40, bpm));
}

export function bpmZone(bpm: number): string {
  if (bpm < 60) return 'Calm';
  if (bpm < 100) return 'Steady';
  if (bpm < 140) return 'Elevated';
  return 'High';
}

export function heartSentence(bpm: number): string {
  return `Heart rate ${bpm} bpm.`;
}
