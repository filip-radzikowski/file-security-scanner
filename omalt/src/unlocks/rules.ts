import { z } from 'zod';

/**
 * Unlocks are data. Each rule says which module is locked, and what measurable thing
 * unlocks it. Two kinds of metric cover almost anything:
 *  - "elapsed": real time since the first entry (an exact countdown).
 *  - "stat":    a count derived from what the user has done (progress toward a target).
 * To add an unlock, add an entry here and register a module for its type.
 */
const unitSchema = z.object({ singular: z.string(), plural: z.string() });

export const unlockRuleSchema = z.object({
  moduleType: z.string(),
  title: z.string(),
  /** One line about what the user gets. */
  teaser: z.string(),
  /** Plain-language condition, e.g. "Write on 3 different days". */
  requirement: z.string(),
  metric: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('elapsed'), ms: z.number().positive() }),
    z.object({
      kind: z.literal('stat'),
      stat: z.enum(['entryCount', 'activeDays', 'tasksDone']),
      target: z.number().int().positive(),
      unit: unitSchema,
    }),
  ]),
});
export type UnlockRule = z.infer<typeof unlockRuleSchema>;

const DAY = 24 * 60 * 60 * 1000;

export const UNLOCK_RULES: UnlockRule[] = z.array(unlockRuleSchema).parse([
  {
    moduleType: 'streak',
    title: 'Streak',
    teaser: 'See the days you showed up, and how long your run is.',
    requirement: 'Write on 3 different days.',
    metric: { kind: 'stat', stat: 'activeDays', target: 3, unit: { singular: 'day', plural: 'days' } },
  },
  {
    moduleType: 'reflect',
    title: 'Reflect',
    teaser: 'A weekly look back at what you wrote, felt and finished.',
    requirement: 'Keep journaling for a week.',
    metric: { kind: 'elapsed', ms: 7 * DAY },
  },
]);

export function ruleForType(type: string): UnlockRule | undefined {
  return UNLOCK_RULES.find((r) => r.moduleType === type);
}
