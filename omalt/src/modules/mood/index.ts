import type { ModuleDefinition } from '../types';
import { MoodCard } from './MoodCard';
import { MoodDashboard } from './MoodDashboard';
import { moodLabel, weeklyAverage, weeklyMood } from './schema';

export const moodModule: ModuleDefinition = {
  type: 'mood',
  Card: MoodCard,
  Dashboard: MoodDashboard,
  summarize: ({ moods }) => {
    const avg = weeklyAverage(weeklyMood(moods));
    return avg === null ? 'No mood logged yet' : `This week: ${moodLabel(avg)}`;
  },
};
