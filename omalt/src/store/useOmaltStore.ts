import { AccessibilityInfo } from 'react-native';
import { create } from 'zustand';
import { z } from 'zod';
import { aiService } from '../ai';
import { CENTER } from '../canvas/constants';
import { findSpawnPosition } from '../canvas/layout';
import * as repo from '../db/repo';
import type { Entry, ExtractedItemRow, ModuleRecord, Suggestion } from '../db/schema';
import { makeId } from '../lib/ids';
import { titleForType } from '../modules/meta';
import { computeProgress, computeStats } from '../unlocks/progress';
import { UNLOCK_RULES } from '../unlocks/rules';
import { MOOD_ITEM_TYPE, MOOD_LEVELS, MoodPoint, deriveMoods, moodPayloadSchema } from '../modules/mood/schema';
import {
  TASK_ITEM_TYPE,
  TaskItem,
  deriveTasks,
  parseTaskPayload,
  taskPayloadSchema,
} from '../modules/todo/schema';
import { reconcileSuggestions } from './suggestions';

const KV_LIST_VIEW = 'settings.listView';
const KV_PAN_CENTER = 'canvas.panCenter';
const KV_CLOCK_OFFSET = 'debug.clockOffsetMs';
const DAY_MS = 24 * 60 * 60 * 1000;

const entryTextSchema = z.string().trim().min(1).max(4000);
const taskTextSchema = z.string().trim().min(1).max(200);
const panCenterSchema = z.object({ x: z.number().finite(), y: z.number().finite() });

export interface PanCenter {
  x: number;
  y: number;
}

export interface AddEntryResult {
  taskCount: number;
  mood: number | null;
}

export interface UnlockNotice {
  moduleId: string;
  title: string;
}

interface OmaltState {
  ready: boolean;
  error: string | null;

  entries: Entry[];
  items: ExtractedItemRow[];
  modules: ModuleRecord[];
  suggestions: Suggestion[];
  tasks: TaskItem[];
  moods: MoodPoint[];

  listView: boolean;
  /** World point that sits at the centre of the viewport. */
  panCenter: PanCenter;
  /** Testing only: shifts "now" forward so time-based unlocks can be previewed. */
  clockOffsetMs: number;
  unlockNotice: UnlockNotice | null;

  init(): Promise<void>;
  addEntry(text: string): Promise<AddEntryResult | null>;
  acceptSuggestion(id: string): Promise<string | null>;
  dismissSuggestion(id: string): Promise<void>;
  toggleTask(id: string): Promise<void>;
  addTask(text: string): Promise<void>;
  logMood(score: number): Promise<void>;
  markModuleUsed(id: string): Promise<void>;
  setListView(value: boolean): Promise<void>;
  savePanCenter(x: number, y: number): void;
  syncUnlocks(): Promise<void>;
  dismissUnlockNotice(): void;
  skipAhead(days: number): Promise<void>;
  resetClock(): Promise<void>;
  resetAll(): Promise<void>;
}

const DEFAULT_PAN: PanCenter = { x: CENTER, y: CENTER };

function derive(entries: Entry[], items: ExtractedItemRow[]) {
  return { tasks: deriveTasks(items, entries), moods: deriveMoods(entries) };
}

export const useOmaltStore = create<OmaltState>((set, get) => {
  /** Re-runs the AI suggestion rules against the current totals and persists any changes. */
  async function refreshSuggestions(): Promise<void> {
    const { tasks, items, modules, suggestions } = get();
    const taskMentions = tasks.filter((t) => t.source === 'entry').length;
    const moodMentions = items.filter((i) => {
      if (i.type !== MOOD_ITEM_TYPE) return false;
      try {
        const p = moodPayloadSchema.safeParse(JSON.parse(i.payload));
        return p.success && p.data.source === 'text';
      } catch {
        return false;
      }
    }).length;
    const candidates = await aiService.suggestModules({ taskMentions, moodMentions });
    const writes = reconcileSuggestions(candidates, suggestions, modules);
    if (writes.length === 0) return;
    for (const w of writes) await repo.upsertSuggestion(w);
    set({
      suggestions: [
        ...suggestions.filter((s) => !writes.some((w) => w.id === s.id)),
        ...writes,
      ],
    });
  }

  const nowMs = () => Date.now() + get().clockOffsetMs;

  /**
   * Adds a locked teaser for every unlock rule once the user has written something,
   * and flips teasers to active when their condition is met. Serialised so overlapping
   * triggers (a new entry and the timer) can't create duplicates.
   */
  async function runUnlockSync(): Promise<void> {
    const { entries, tasks, modules } = get();
    if (entries.length === 0) return;
    const stats = computeStats(entries, tasks);
    const now = nowMs();
    const known = [...modules];
    const created: ModuleRecord[] = [];
    const activated: ModuleRecord[] = [];

    for (const rule of UNLOCK_RULES) {
      let m = known.find((x) => x.type === rule.moduleType);
      if (!m) {
        const spot = findSpawnPosition(known.map((k) => ({ x: k.x, y: k.y })));
        m = {
          id: makeId('mod'),
          type: rule.moduleType,
          title: rule.title,
          x: spot.x,
          y: spot.y,
          addedAt: now,
          lastUsedAt: now,
          status: 'locked',
        };
        await repo.insertModule(m);
        known.push(m);
        created.push(m);
      }
      if (m.status === 'locked' && computeProgress(rule, stats, now).unlocked) {
        await repo.setModuleStatus(m.id, 'active');
        const unlocked: ModuleRecord = { ...m, status: 'active', lastUsedAt: now };
        known[known.indexOf(m)] = unlocked;
        activated.push(unlocked);
      }
    }
    if (created.length === 0 && activated.length === 0) return;

    set((s) => {
      const byId = new Map(s.modules.map((x) => [x.id, x]));
      for (const c of created) if (!byId.has(c.id)) byId.set(c.id, c);
      for (const a of activated) byId.set(a.id, { ...(byId.get(a.id) ?? a), status: 'active' });
      const last = activated[activated.length - 1];
      return {
        modules: [...byId.values()],
        unlockNotice: last ? { moduleId: last.id, title: last.title } : s.unlockNotice,
      };
    });
  }
  let unlockQueue: Promise<void> = Promise.resolve();
  const enqueueUnlockSync = () => {
    unlockQueue = unlockQueue.then(runUnlockSync).catch(() => {});
    return unlockQueue;
  };

  return {
    ready: false,
    error: null,
    entries: [],
    items: [],
    modules: [],
    suggestions: [],
    tasks: [],
    moods: [],
    listView: false,
    panCenter: DEFAULT_PAN,
    clockOffsetMs: 0,
    unlockNotice: null,

    async init() {
      try {
        const [entries, items, modules, suggestions, listViewRaw, panRaw, offsetRaw] = await Promise.all([
          repo.listEntries(),
          repo.listExtractedItems(),
          repo.listModules(),
          repo.listSuggestions(),
          repo.getKv(KV_LIST_VIEW),
          repo.getKv(KV_PAN_CENTER),
          repo.getKv(KV_CLOCK_OFFSET),
        ]);

        let listView = listViewRaw === '1';
        if (listViewRaw === null) {
          // First launch: default to the plain list when a screen reader is running.
          try {
            listView = await AccessibilityInfo.isScreenReaderEnabled();
          } catch {
            listView = false;
          }
        }

        let panCenter = DEFAULT_PAN;
        if (panRaw) {
          try {
            const parsed = panCenterSchema.safeParse(JSON.parse(panRaw));
            if (parsed.success) panCenter = parsed.data;
          } catch {
            // fall back to the centre
          }
        }

        const offset = Number(offsetRaw);
        set({
          entries,
          items,
          modules,
          suggestions,
          ...derive(entries, items),
          listView,
          panCenter,
          clockOffsetMs: Number.isFinite(offset) ? offset : 0,
          ready: true,
        });
        enqueueUnlockSync();
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Could not open the local database.', ready: true });
      }
    },

    async addEntry(rawText) {
      const parsed = entryTextSchema.safeParse(rawText);
      if (!parsed.success) return null;
      const text = parsed.data;

      const analysis = await aiService.analyzeEntry(text);
      const entry: Entry = {
        id: makeId('ent'),
        text,
        createdAt: nowMs(),
        mood: analysis.mood?.score ?? null,
      };
      const newItems: ExtractedItemRow[] = analysis.tasks.map((t) => ({
        id: makeId('itm'),
        entryId: entry.id,
        type: TASK_ITEM_TYPE,
        payload: JSON.stringify(taskPayloadSchema.parse({ text: t.text, done: false, source: 'entry' })),
      }));
      if (analysis.mood) {
        newItems.push({
          id: makeId('itm'),
          entryId: entry.id,
          type: MOOD_ITEM_TYPE,
          payload: JSON.stringify(
            moodPayloadSchema.parse({ score: analysis.mood.score, words: analysis.mood.words, source: 'text' }),
          ),
        });
      }

      await repo.inTransaction(async () => {
        await repo.insertEntry(entry);
        for (const item of newItems) await repo.insertExtractedItem(item);
      });

      const entries = [...get().entries, entry];
      const items = [...get().items, ...newItems];
      set({ entries, items, ...derive(entries, items) });
      await refreshSuggestions();
      await enqueueUnlockSync();

      return { taskCount: analysis.tasks.length, mood: analysis.mood?.score ?? null };
    },

    async acceptSuggestion(id) {
      const suggestion = get().suggestions.find((s) => s.id === id);
      if (!suggestion) return null;

      let module = get().modules.find((m) => m.type === suggestion.moduleType);
      if (!module) {
        const spot = findSpawnPosition(get().modules.map((m) => ({ x: m.x, y: m.y })));
        const now = Date.now();
        module = {
          id: makeId('mod'),
          type: suggestion.moduleType,
          title: titleForType(suggestion.moduleType),
          x: spot.x,
          y: spot.y,
          addedAt: now,
          lastUsedAt: now,
          status: 'active',
        };
        await repo.insertModule(module);
      }
      await repo.setSuggestionStatus(id, 'accepted');
      const created = module;
      set((s) => ({
        modules: s.modules.some((m) => m.id === created.id) ? s.modules : [...s.modules, created],
        suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'accepted' as const } : x)),
      }));
      return module.id;
    },

    async dismissSuggestion(id) {
      await repo.setSuggestionStatus(id, 'dismissed');
      set((s) => ({
        suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status: 'dismissed' as const } : x)),
      }));
    },

    async toggleTask(id) {
      const item = get().items.find((i) => i.id === id);
      const payload = item ? parseTaskPayload(item.payload) : null;
      if (!item || !payload) return;
      const done = !payload.done;
      const next = JSON.stringify({ ...payload, done, doneAt: done ? nowMs() : undefined });
      await repo.updateExtractedItemPayload(id, next);
      const items = get().items.map((i) => (i.id === id ? { ...i, payload: next } : i));
      set({ items, ...derive(get().entries, items) });
    },

    async addTask(rawText) {
      const parsed = taskTextSchema.safeParse(rawText);
      if (!parsed.success) return;
      const item: ExtractedItemRow = {
        id: makeId('itm'),
        entryId: null,
        type: TASK_ITEM_TYPE,
        payload: JSON.stringify(
          taskPayloadSchema.parse({ text: parsed.data, done: false, source: 'manual', createdAt: nowMs() }),
        ),
      };
      await repo.insertExtractedItem(item);
      const items = [...get().items, item];
      set({ items, ...derive(get().entries, items) });
    },

    async logMood(score) {
      const level = MOOD_LEVELS.find((l) => l.score === score);
      if (!level) return;
      const entry: Entry = {
        id: makeId('ent'),
        text: `Feeling ${level.label.toLowerCase()} today.`,
        createdAt: nowMs(),
        mood: level.score,
      };
      const item: ExtractedItemRow = {
        id: makeId('itm'),
        entryId: entry.id,
        type: MOOD_ITEM_TYPE,
        payload: JSON.stringify(moodPayloadSchema.parse({ score: level.score, words: [], source: 'log' })),
      };
      await repo.inTransaction(async () => {
        await repo.insertEntry(entry);
        await repo.insertExtractedItem(item);
      });
      const entries = [...get().entries, entry];
      const items = [...get().items, item];
      set({ entries, items, ...derive(entries, items) });
      await enqueueUnlockSync();
    },

    async markModuleUsed(id) {
      const at = nowMs();
      await repo.touchModule(id, at);
      set((s) => ({ modules: s.modules.map((m) => (m.id === id ? { ...m, lastUsedAt: at } : m)) }));
    },

    async setListView(value) {
      set({ listView: value });
      await repo.setKv(KV_LIST_VIEW, value ? '1' : '0');
    },

    savePanCenter(x, y) {
      set({ panCenter: { x, y } });
      repo.setKv(KV_PAN_CENTER, JSON.stringify({ x, y })).catch(() => {});
    },

    syncUnlocks() {
      return enqueueUnlockSync();
    },

    dismissUnlockNotice() {
      set({ unlockNotice: null });
    },

    async skipAhead(days) {
      const offset = get().clockOffsetMs + days * DAY_MS;
      set({ clockOffsetMs: offset });
      await repo.setKv(KV_CLOCK_OFFSET, String(offset));
      await enqueueUnlockSync();
    },

    async resetClock() {
      set({ clockOffsetMs: 0 });
      await repo.setKv(KV_CLOCK_OFFSET, '0');
    },

    async resetAll() {
      await repo.eraseAll();
      set({
        entries: [],
        items: [],
        modules: [],
        suggestions: [],
        tasks: [],
        moods: [],
        listView: false,
        panCenter: DEFAULT_PAN,
        clockOffsetMs: 0,
        unlockNotice: null,
      });
    },
  };
});
