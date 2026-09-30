import { lastSevenDays } from '../daily';
import type { ModuleDefinition } from '../types';
import { WeatherCard } from './WeatherCard';
import { WeatherDashboard } from './WeatherDashboard';
import { conditionLabel, deriveWeather } from './schema';

export const weatherModule: ModuleDefinition = {
  type: 'weather',
  Card: WeatherCard,
  Dashboard: WeatherDashboard,
  summarize: ({ items, entries }) => {
    const slot = lastSevenDays(deriveWeather(items, entries)).pop();
    const last = slot?.values[slot.values.length - 1];
    return last ? `Today: ${conditionLabel(last.data.condition)}` : 'Nothing logged today';
  },
};
