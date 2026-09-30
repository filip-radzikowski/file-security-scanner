import type { ModuleDefinition } from '../types';
import { ReflectCard } from './ReflectCard';
import { ReflectDashboard } from './ReflectDashboard';
import { deriveReflections, reflectedThisWeek, weekSummary } from './schema';

export const reflectModule: ModuleDefinition = {
  type: 'reflect',
  Card: ReflectCard,
  Dashboard: ReflectDashboard,
  summarize: ({ entries, tasks, items }) => {
    const done = reflectedThisWeek(deriveReflections(items, entries), new Date());
    const w = weekSummary(entries, tasks, Date.now());
    return `${done ? 'Reflected this week' : 'Time to reflect'}, ${w.entryCount} ${w.entryCount === 1 ? 'entry' : 'entries'} this week`;
  },
};
