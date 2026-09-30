import type { ModuleDefinition } from '../types';
import { SleepCard } from './SleepCard';
import { SleepDashboard } from './SleepDashboard';
import { deriveSleep, formatHours, weeklySleep } from './schema';

export const sleepModule: ModuleDefinition = {
  type: 'sleep',
  Card: SleepCard,
  Dashboard: SleepDashboard,
  summarize: ({ items, entries, health }) => {
    const w = weeklySleep(deriveSleep(items, entries), undefined, health);
    return w.lastNight === null ? 'No sleep logged yet' : `Last night: ${formatHours(w.lastNight)}`;
  },
};
