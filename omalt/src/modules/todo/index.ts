import type { ModuleDefinition } from '../types';
import { TodoCard } from './TodoCard';
import { TodoDashboard } from './TodoDashboard';
import { taskStats } from './schema';

export const todoModule: ModuleDefinition = {
  type: 'todo',
  Card: TodoCard,
  Dashboard: TodoDashboard,
  summarize: ({ tasks }) => {
    const s = taskStats(tasks);
    return s.total === 0 ? 'No tasks yet' : `${s.open} open, ${s.done} done`;
  },
};
