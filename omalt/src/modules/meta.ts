/** Lightweight module metadata with no UI imports, safe for the store and DB layers. */

export const MODULE_TYPES = ['todo', 'mood'] as const;
export type KnownModuleType = (typeof MODULE_TYPES)[number];

export const MODULE_TITLES: Record<KnownModuleType, string> = {
  todo: 'To-do',
  mood: 'Mood',
};

export function isKnownModuleType(type: string): type is KnownModuleType {
  return (MODULE_TYPES as readonly string[]).includes(type);
}

export function titleForType(type: string): string {
  return isKnownModuleType(type) ? MODULE_TITLES[type] : type.charAt(0).toUpperCase() + type.slice(1);
}
