import type { ModuleDefinition } from '../types';
import { StreakCard } from './StreakCard';
import { StreakDashboard } from './StreakDashboard';
import { streakInfo } from './schema';

export const streakModule: ModuleDefinition = {
  type: 'streak',
  Card: StreakCard,
  Dashboard: StreakDashboard,
  summarize: ({ entries }) => {
    const s = streakInfo(entries, Date.now());
    return `${s.current} day${s.current === 1 ? '' : 's'} in a row`;
  },
};
