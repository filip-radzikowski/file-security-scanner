import type { ComponentType } from 'react';
import type { Entry, ExtractedItemRow, ModuleRecord } from '../db/schema';
import type { HealthDailyMap, HeartReading } from '../health';
import type { MoodPoint } from './mood/schema';
import type { TaskItem } from './todo/schema';

/** Live data every module can read from. */
export interface ModuleData {
  tasks: TaskItem[];
  moods: MoodPoint[];
  entries: Entry[];
  items: ExtractedItemRow[];
  /** Synced health values by day. Empty when nothing is connected. */
  health: HealthDailyMap;
  /** Latest heart rate from a connected source, if any. */
  heart: HeartReading | null;
}

export interface CardProps {
  module: ModuleRecord;
}

export interface DashboardProps {
  module: ModuleRecord;
}

export interface ModuleDefinition {
  type: string;
  Card: ComponentType<CardProps>;
  Dashboard: ComponentType<DashboardProps>;
  /** One-line description used by the card, the list view and screen readers. */
  summarize(data: ModuleData): string;
}
