import { z } from 'zod';
import type { Entry, ExtractedItemRow } from '../../db/schema';

export const TASK_ITEM_TYPE = 'task';

/** JSON stored in extracted_items.payload for type "task". */
export const taskPayloadSchema = z.object({
  text: z.string().min(1).max(200),
  done: z.boolean().default(false),
  doneAt: z.number().optional(),
  source: z.enum(['entry', 'manual']).default('entry'),
  /** Only set for manual tasks, which have no entry to take a date from. */
  createdAt: z.number().optional(),
});
export type TaskPayload = z.infer<typeof taskPayloadSchema>;

export interface TaskItem {
  id: string;
  entryId: string | null;
  text: string;
  done: boolean;
  doneAt?: number;
  source: 'entry' | 'manual';
  createdAt: number;
}

export function parseTaskPayload(json: string): TaskPayload | null {
  try {
    const parsed = taskPayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function deriveTasks(items: ExtractedItemRow[], entries: Entry[]): TaskItem[] {
  const entryTime = new Map(entries.map((e) => [e.id, e.createdAt]));
  const tasks: TaskItem[] = [];
  for (const item of items) {
    if (item.type !== TASK_ITEM_TYPE) continue;
    const payload = parseTaskPayload(item.payload);
    if (!payload) continue;
    tasks.push({
      id: item.id,
      entryId: item.entryId,
      text: payload.text,
      done: payload.done,
      doneAt: payload.doneAt,
      source: payload.source,
      createdAt: (item.entryId ? entryTime.get(item.entryId) : undefined) ?? payload.createdAt ?? 0,
    });
  }
  return tasks.sort((a, b) => a.createdAt - b.createdAt);
}

export interface TaskStats {
  total: number;
  done: number;
  open: number;
  /** 0..1 */
  progress: number;
}

export function taskStats(tasks: TaskItem[]): TaskStats {
  const done = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  return { total, done, open: total - done, progress: total === 0 ? 0 : done / total };
}
