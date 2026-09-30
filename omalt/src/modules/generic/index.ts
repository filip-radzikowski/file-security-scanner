import type { ModuleDefinition } from '../types';
import { GenericCard } from './GenericCard';
import { GenericDashboard } from './GenericDashboard';

export const genericModule: ModuleDefinition = {
  type: 'generic',
  Card: GenericCard,
  Dashboard: GenericDashboard,
  summarize: () => 'Coming soon',
};
