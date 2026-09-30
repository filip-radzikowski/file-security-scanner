import { useMemo } from 'react';
import { useNow } from '../lib/useNow';
import { useOmaltStore } from '../store/useOmaltStore';
import { UnlockProgress, computeProgress, computeStats } from './progress';
import { UnlockRule, ruleForType } from './rules';

/** Live progress toward unlocking a module type, or null if the type has no unlock rule. */
export function useUnlockProgress(type: string): { rule: UnlockRule; progress: UnlockProgress } | null {
  const entries = useOmaltStore((s) => s.entries);
  const tasks = useOmaltStore((s) => s.tasks);
  const now = useNow();
  const rule = ruleForType(type);
  return useMemo(() => {
    if (!rule) return null;
    return { rule, progress: computeProgress(rule, computeStats(entries, tasks), now) };
  }, [rule, entries, tasks, now]);
}
