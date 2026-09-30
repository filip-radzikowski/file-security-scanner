import type { ModuleDefinition } from '../types';
import { StepsCard } from './StepsCard';
import { StepsDashboard } from './StepsDashboard';
import { deriveSteps, weeklySteps } from './schema';

export const stepsModule: ModuleDefinition = {
  type: 'steps',
  Card: StepsCard,
  Dashboard: StepsDashboard,
  summarize: ({ items, entries }) => {
    const w = weeklySteps(deriveSteps(items, entries));
    return w.today === null ? 'No steps today' : `${w.today.toLocaleString()} steps today`;
  },
};
