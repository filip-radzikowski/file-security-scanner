/** Lightweight module metadata with no UI imports, safe for the store and DB layers. */

export const MODULE_TYPES = ['todo', 'mood', 'reflect', 'streak', 'weather', 'sleep', 'steps', 'heart'] as const;
export type KnownModuleType = (typeof MODULE_TYPES)[number];

export const MODULE_TITLES: Record<KnownModuleType, string> = {
  todo: 'To-do',
  mood: 'Mood',
  reflect: 'Reflect',
  streak: 'Streak',
  weather: 'Weather',
  sleep: 'Sleep',
  steps: 'Steps',
  heart: 'Heart',
};

export function isKnownModuleType(type: string): type is KnownModuleType {
  return (MODULE_TYPES as readonly string[]).includes(type);
}

export function titleForType(type: string): string {
  return isKnownModuleType(type) ? MODULE_TITLES[type] : type.charAt(0).toUpperCase() + type.slice(1);
}
