import { format, startOfDay } from 'date-fns';
import type { Entry } from '../db/schema';
import type { TaskItem } from '../modules/todo/schema';
import type { UnlockRule } from './rules';

export interface UnlockStats {
  entryCount: number;
  activeDays: number;
  tasksDone: number;
  firstEntryAt: number | null;
}

export function computeStats(entries: Entry[], tasks: TaskItem[]): UnlockStats {
  const days = new Set(entries.map((e) => format(startOfDay(e.createdAt), 'yyyy-MM-dd')));
  return {
    entryCount: entries.length,
    activeDays: days.size,
    tasksDone: tasks.filter((t) => t.done).length,
    firstEntryAt: entries.length ? Math.min(...entries.map((e) => e.createdAt)) : null,
  };
}

export interface UnlockProgress {
  /** 0..1 */
  fraction: number;
  unlocked: boolean;
  /** e.g. "3d 4h left" or "2 more days". */
  remainingLabel: string;
  /** Exact unlock time, for elapsed rules once the clock has started. */
  unlockAt?: number;
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Ready';
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const mins = Math.ceil((ms % HOUR) / MIN);
  if (days >= 1) return hours > 0 ? `${days}d ${hours}h left` : `${days} day${days === 1 ? '' : 's'} left`;
  if (hours >= 1) return `${hours}h ${mins === 60 ? 0 : mins}m left`;
  return `${Math.max(1, mins)} min left`;
}

export function computeProgress(rule: UnlockRule, stats: UnlockStats, now: number): UnlockProgress {
  const m = rule.metric;
  if (m.kind === 'elapsed') {
    if (stats.firstEntryAt === null) {
      return { fraction: 0, unlocked: false, remainingLabel: 'Starts with your first entry' };
    }
    const elapsed = Math.max(0, now - stats.firstEntryAt);
    const fraction = Math.min(1, elapsed / m.ms);
    return {
      fraction,
      unlocked: fraction >= 1,
      remainingLabel: formatRemaining(m.ms - elapsed),
      unlockAt: stats.firstEntryAt + m.ms,
    };
  }
  const value = stats[m.stat];
  const remaining = Math.max(0, m.target - value);
  return {
    fraction: Math.min(1, value / m.target),
    unlocked: remaining === 0,
    remainingLabel:
      remaining === 0 ? 'Ready' : `${remaining} more ${remaining === 1 ? m.unit.singular : m.unit.plural}`,
  };
}
