import type { ModuleDefinition } from '../types';
import { HeartCard } from './HeartCard';
import { HeartDashboard } from './HeartDashboard';
import { deriveHeart } from './schema';

export const heartModule: ModuleDefinition = {
  type: 'heart',
  Card: HeartCard,
  Dashboard: HeartDashboard,
  summarize: ({ heart, items, entries }) => {
    if (heart) return `${heart.bpm} bpm`;
    const last = deriveHeart(items, entries).filter((p) => p.data.bpm !== undefined).pop();
    return last ? `${last.data.bpm} bpm` : 'No reading yet';
  },
};
