import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';
import { DatedValue, deriveDated } from '../daily';

export const WEATHER_ITEM_TYPE = 'weather';

export const weatherPayloadSchema = z.object({ condition: z.string().optional() });
export type WeatherPayload = z.infer<typeof weatherPayloadSchema>;

export const WEATHER_CONDITIONS = [
  { id: 'sunny', label: 'Sunny' },
  { id: 'cloudy', label: 'Cloudy' },
  { id: 'rainy', label: 'Rainy' },
  { id: 'stormy', label: 'Stormy' },
  { id: 'snowy', label: 'Snowy' },
  { id: 'windy', label: 'Windy' },
  { id: 'hot', label: 'Hot' },
  { id: 'cold', label: 'Cold' },
] as const;

export function conditionLabel(id: string | undefined): string {
  return WEATHER_CONDITIONS.find((c) => c.id === id)?.label ?? 'Noted';
}

export function deriveWeather(items: ExtractedItemRow[], entries: Entry[]): DatedValue<WeatherPayload>[] {
  return deriveDated(WEATHER_ITEM_TYPE, items, entries, (j) => {
    const p = weatherPayloadSchema.safeParse(j);
    return p.success ? p.data : null;
  });
}

/** The diary sentence written when the user taps a condition. */
export function weatherSentence(conditionId: string): string {
  return `It's ${conditionId} today.`;
}
