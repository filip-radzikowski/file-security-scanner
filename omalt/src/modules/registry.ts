import { genericModule } from './generic';
import { moodModule } from './mood';
import { reflectModule } from './reflect';
import { sleepModule } from './sleep';
import { stepsModule } from './steps';
import { streakModule } from './streak';
import { weatherModule } from './weather';
import { todoModule } from './todo';
import type { ModuleDefinition } from './types';

const definitions: Record<string, ModuleDefinition> = {
  todo: todoModule,
  mood: moodModule,
  reflect: reflectModule,
  streak: streakModule,
  weather: weatherModule,
  sleep: sleepModule,
  steps: stepsModule,
};

/** Falls back to the generic placeholder for any module type without its own folder. */
export function getModuleDefinition(type: string): ModuleDefinition {
  return definitions[type] ?? genericModule;
}
