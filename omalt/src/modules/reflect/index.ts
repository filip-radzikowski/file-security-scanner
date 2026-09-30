import type { ModuleDefinition } from '../types';
import { ReflectCard } from './ReflectCard';
import { ReflectDashboard } from './ReflectDashboard';
import { weekSummary } from './schema';

export const reflectModule: ModuleDefinition = {
  type: 'reflect',
  Card: ReflectCard,
  Dashboard: ReflectDashboard,
  summarize: ({ entries, tasks }) => {
    const w = weekSummary(entries, tasks, Date.now());
    return `${w.entryCount} ${w.entryCount === 1 ? 'entry' : 'entries'} this week`;
  },
};
