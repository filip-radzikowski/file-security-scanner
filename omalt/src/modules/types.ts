import type { ComponentType } from 'react';
import type { Entry, ModuleRecord } from '../db/schema';
import type { MoodPoint } from './mood/schema';
import type { TaskItem } from './todo/schema';

/** Live data every module can read from. */
export interface ModuleData {
  tasks: TaskItem[];
  moods: MoodPoint[];
  entries: Entry[];
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
