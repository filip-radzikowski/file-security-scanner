import { genericModule } from './generic';
import { moodModule } from './mood';
import { todoModule } from './todo';
import type { ModuleDefinition } from './types';

const definitions: Record<string, ModuleDefinition> = {
  todo: todoModule,
  mood: moodModule,
};

/** Falls back to the generic placeholder for any module type without its own folder. */
export function getModuleDefinition(type: string): ModuleDefinition {
  return definitions[type] ?? genericModule;
}
