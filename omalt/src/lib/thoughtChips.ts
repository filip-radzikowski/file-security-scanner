import type { Entry, ExtractedItemRow } from '../db/schema';
import { HEART_ITEM_TYPE, heartPayloadSchema } from '../modules/heart/schema';
import { moodLabel } from '../modules/mood/schema';
import { formatHours, sleepPayloadSchema } from '../modules/sleep/schema';
import { stepsPayloadSchema } from '../modules/steps/schema';
import { parseTaskPayload } from '../modules/todo/schema';
import { conditionLabel, weatherPayloadSchema } from '../modules/weather/schema';

function parse<T>(schema: { safeParse(v: unknown): { success: boolean; data?: T } }, json: string): T | null {
  try {
    const r = schema.safeParse(JSON.parse(json));
    return r.success ? (r.data as T) : null;
  } catch {
    return null;
  }
}

/** Short labels for what Omalt noticed in an entry (tasks, mood, weather, sleep, steps, heart). */
export function thoughtChips(entry: Entry, items: ExtractedItemRow[]): string[] {
  const mine = items.filter((i) => i.entryId === entry.id);
  const out: string[] = [];
  const tasks = mine.filter((i) => i.type === 'task' && parseTaskPayload(i.payload));
  if (tasks.length) out.push(`${tasks.length} task${tasks.length === 1 ? '' : 's'} noticed`);
  if (entry.mood !== null) out.push(`Feeling ${moodLabel(entry.mood).toLowerCase()} (${entry.mood})`);
  for (const i of mine) {
    if (i.type === 'weather') {
      const w = parse<{ condition?: string }>(weatherPayloadSchema, i.payload);
      out.push(w?.condition ? `Weather: ${conditionLabel(w.condition)}` : 'Weather');
    } else if (i.type === 'sleep') {
      const p = parse<{ hours?: number }>(sleepPayloadSchema, i.payload);
      out.push(p?.hours ? `Sleep: ${formatHours(p.hours)}` : 'Sleep');
    } else if (i.type === 'steps') {
      const p = parse<{ count?: number }>(stepsPayloadSchema, i.payload);
      out.push(p?.count ? `${p.count.toLocaleString()} steps` : 'Walking');
    } else if (i.type === HEART_ITEM_TYPE) {
      const p = parse<{ bpm?: number }>(heartPayloadSchema, i.payload);
      out.push(p?.bpm ? `${p.bpm} bpm` : 'Heart rate');
    }
  }
  return out;
}
