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
import { NOTIFY_NUDGE, nudgeById, pickNudge } from '../nudges/nudges';
import { cancelNudges, ensurePermission, scheduleNudges } from '../nudges/notifications';
import { praiseForEntry, praiseForTask } from '../nudges/praise';
import { SLEEP_ITEM_TYPE, sleepPayloadSchema } from '../modules/sleep/schema';
import { STEPS_ITEM_TYPE, stepsPayloadSchema } from '../modules/steps/schema';
import { streakInfo } from '../modules/streak/schema';
import { WEATHER_ITEM_TYPE, weatherPayloadSchema } from '../modules/weather/schema';
import { computeProgress, computeStats } from '../unlocks/progress';
import { UNLOCK_RULES } from '../unlocks/rules';
import {
  MOOD_ITEM_TYPE,
  MOOD_LEVELS,
  MoodPoint,
  deriveMoods,
  moodIndex,
  moodPayloadSchema,
  valueForLevel,
} from '../modules/mood/schema';
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
const KV_SMOOTH_MOTION = 'settings.smoothMotion';
const KV_CLOCK_OFFSET = 'debug.clockOffsetMs';
const KV_NUDGES_ENABLED = 'settings.nudges';
const KV_NUDGE_LAST = 'nudge.last';
const KV_NUDGE_RECENT = 'nudge.recent';
const KV_NUDGE_ASKED = 'nudge.askedNotify';
const KV_NUDGE_SCHEDULED = 'nudge.scheduledAt';
const FOLLOWUP_ITEM_TYPE = 'followup';
/** Minimum gap between in-app nudges. */
const NUDGE_GAP_MS = 3 * 60 * 60 * 1000;
const TOPIC_MODULE_TYPES = [WEATHER_ITEM_TYPE, SLEEP_ITEM_TYPE, STEPS_ITEM_TYPE];
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
  /** Omalt's short reaction to what was written. */
  message: string;
}

export interface Cheer {
  id: number;
  message: string;
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
  /** Keep canvas gliding and flying even if the phone's Reduce Motion is on. Default true. */
  smoothMotion: boolean;
  /** World point that sits at the centre of the viewport. */
  panCenter: PanCenter;
  /** Testing only: shifts "now" forward so time-based unlocks can be previewed. */
  clockOffsetMs: number;
  unlockNotice: UnlockNotice | null;
  /** A short, warm message from Omalt, shown briefly as a banner. */
  cheer: Cheer | null;
  /** The nudge (quick prompt) currently offered, if any. */
  activeNudge: string | null;
  nudgesEnabled: boolean;

  init(): Promise<void>;
  /** Saves a diary entry. Pass announce: false when the caller shows the returned message itself. */
  addEntry(text: string, opts?: { announce?: boolean }): Promise<AddEntryResult | null>;
  addFollowUp(entryId: string, text: string): Promise<void>;
  showCheer(message: string): void;
  clearCheer(): void;
  maybeShowNudge(): Promise<void>;
  showNudge(id: string): void;
  dismissNudge(): void;
  /** Writes the nudge's answer to the diary and closes the card. */
  answerNudge(sentence: string): Promise<void>;
  /** Returns false if notification permission was refused. */
  setNudgesEnabled(on: boolean): Promise<boolean>;
  refreshNudgeSchedule(force?: boolean): Promise<void>;
  acceptSuggestion(id: string): Promise<string | null>;
  dismissSuggestion(id: string): Promise<void>;
  toggleTask(id: string): Promise<void>;
  addTask(text: string): Promise<void>;
  /** value is 0-100. */
  logMood(value: number): Promise<void>;
  markModuleUsed(id: string): Promise<void>;
  setListView(value: boolean): Promise<void>;
  setSmoothMotion(value: boolean): Promise<void>;
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
    const topicMentions: Record<string, number> = {};
    for (const i of items) if (TOPIC_MODULE_TYPES.includes(i.type)) topicMentions[i.type] = (topicMentions[i.type] ?? 0) + 1;
    const candidates = await aiService.suggestModules({ taskMentions, moodMentions, topicMentions });
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
    smoothMotion: true,
    panCenter: DEFAULT_PAN,
    clockOffsetMs: 0,
    unlockNotice: null,
    cheer: null,
    activeNudge: null,
    nudgesEnabled: false,

    async init() {
      try {
        const [entries, items, modules, suggestions, listViewRaw, panRaw, offsetRaw, nudgesRaw, smoothRaw] = await Promise.all([
          repo.listEntries(),
          repo.listExtractedItems(),
          repo.listModules(),
          repo.listSuggestions(),
          repo.getKv(KV_LIST_VIEW),
          repo.getKv(KV_PAN_CENTER),
          repo.getKv(KV_CLOCK_OFFSET),
          repo.getKv(KV_NUDGES_ENABLED),
          repo.getKv(KV_SMOOTH_MOTION),
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
          nudgesEnabled: nudgesRaw === '1',
          smoothMotion: smoothRaw !== '0',
          ready: true,
        });
        enqueueUnlockSync();
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Could not open the local database.', ready: true });
      }
    },

    async addEntry(rawText, opts) {
      const parsed = entryTextSchema.safeParse(rawText);
      if (!parsed.success) return null;
      const text = parsed.data;

      const analysis = await aiService.analyzeEntry(text);
      const entry: Entry = {
        id: makeId('ent'),
        text,
        createdAt: nowMs(),
        mood: analysis.mood ? valueForLevel(analysis.mood.score) : null,
      };
      const newItems: ExtractedItemRow[] = analysis.tasks.map((t) => ({
        id: makeId('itm'),
        entryId: entry.id,
        type: TASK_ITEM_TYPE,
        payload: JSON.stringify(taskPayloadSchema.parse({ text: t.text, done: false, source: 'entry' })),
      }));
      for (const t of analysis.topics) {
        if (t.type === 'weather') {
          newItems.push({
            id: makeId('itm'),
            entryId: entry.id,
            type: WEATHER_ITEM_TYPE,
            payload: JSON.stringify(weatherPayloadSchema.parse({ condition: t.label })),
          });
        } else if (t.type === 'sleep') {
          newItems.push({
            id: makeId('itm'),
            entryId: entry.id,
            type: SLEEP_ITEM_TYPE,
            payload: JSON.stringify(sleepPayloadSchema.parse({ hours: t.value })),
          });
        } else if (t.type === 'steps') {
          newItems.push({
            id: makeId('itm'),
            entryId: entry.id,
            type: STEPS_ITEM_TYPE,
            payload: JSON.stringify(stepsPayloadSchema.parse({ count: t.value })),
          });
        }
      }
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

      const before = get().entries;
      const entries = [...before, entry];
      const items = [...get().items, ...newItems];
      set({ entries, items, ...derive(entries, items) });
      await refreshSuggestions();
      await enqueueUnlockSync();

      const firstToday = !before.some((e) => new Date(e.createdAt).toDateString() === new Date(entry.createdAt).toDateString());
      const message = praiseForEntry({
        entryCount: entries.length,
        analysis,
        streak: streakInfo(entries, entry.createdAt).current,
        firstToday,
        moodValue: entry.mood,
      });
      if (opts?.announce !== false) get().showCheer(message);

      return { taskCount: analysis.tasks.length, mood: entry.mood, message };
    },

    async addFollowUp(entryId, rawText) {
      const parsed = entryTextSchema.safeParse(rawText);
      if (!parsed.success) return;
      const item: ExtractedItemRow = {
        id: makeId('itm'),
        entryId,
        type: FOLLOWUP_ITEM_TYPE,
        payload: JSON.stringify({ text: parsed.data, at: nowMs() }),
      };
      await repo.insertExtractedItem(item);
      set((s) => ({ items: [...s.items, item] }));
      get().showCheer('Thanks for going deeper. That is how patterns show up.');
    },

    showCheer(message) {
      set({ cheer: { id: Date.now(), message } });
    },

    clearCheer() {
      set({ cheer: null });
    },

    async maybeShowNudge() {
      const s = get();
      if (!s.ready || s.activeNudge || s.entries.length < 1 || s.unlockNotice) return;
      if (s.suggestions.some((x) => x.status === 'pending')) return;
      const last = Number(await repo.getKv(KV_NUDGE_LAST));
      if (Number.isFinite(last) && Date.now() - last < NUDGE_GAP_MS) return;

      // Once, after a couple of entries, offer notifications.
      const asked = (await repo.getKv(KV_NUDGE_ASKED)) === '1';
      let id: string;
      if (!s.nudgesEnabled && !asked && s.entries.length >= 2) {
        id = NOTIFY_NUDGE.id;
        await repo.setKv(KV_NUDGE_ASKED, '1');
      } else {
        let recent: string[] = [];
        try {
          const raw = await repo.getKv(KV_NUDGE_RECENT);
          if (raw) recent = z.array(z.string()).catch([]).parse(JSON.parse(raw));
        } catch {
          recent = [];
        }
        id = pickNudge(recent.slice(-3)).id;
        await repo.setKv(KV_NUDGE_RECENT, JSON.stringify([...recent, id].slice(-6)));
      }
      await repo.setKv(KV_NUDGE_LAST, String(Date.now()));
      set({ activeNudge: id });
    },

    showNudge(id) {
      if (nudgeById(id)) set({ activeNudge: id });
    },

    dismissNudge() {
      set({ activeNudge: null });
    },

    async answerNudge(sentence) {
      set({ activeNudge: null });
      await get().addEntry(sentence);
    },

    async setNudgesEnabled(on) {
      if (on) {
        const ok = await ensurePermission().catch(() => false);
        if (!ok) return false;
        set({ nudgesEnabled: true });
        await repo.setKv(KV_NUDGES_ENABLED, '1');
        await get().refreshNudgeSchedule(true);
        return true;
      }
      set({ nudgesEnabled: false });
      await repo.setKv(KV_NUDGES_ENABLED, '0');
      await cancelNudges().catch(() => {});
      return true;
    },

    async refreshNudgeSchedule(force) {
      if (!get().nudgesEnabled) return;
      const at = Number(await repo.getKv(KV_NUDGE_SCHEDULED));
      if (!force && Number.isFinite(at) && Date.now() - at < DAY_MS) return;
      try {
        await scheduleNudges();
        await repo.setKv(KV_NUDGE_SCHEDULED, String(Date.now()));
      } catch {
        // Notifications are optional; never break the app over them.
      }
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
      get().showCheer(`${created.title} added. I'll keep track of it with you.`);
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
      if (done) {
        const today = new Date(nowMs()).toDateString();
        const tasks = get().tasks;
        const doneToday = tasks.filter((t) => t.done && t.doneAt !== undefined && new Date(t.doneAt).toDateString() === today).length;
        get().showCheer(praiseForTask(doneToday, tasks.filter((t) => !t.done).length));
      }
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

    async logMood(rawValue) {
      if (!Number.isFinite(rawValue)) return;
      const value = Math.min(100, Math.max(0, Math.round(rawValue)));
      const level = MOOD_LEVELS[moodIndex(value)];
      const entry: Entry = {
        id: makeId('ent'),
        text: `Feeling ${level.label.toLowerCase()} today (${value}/100).`,
        createdAt: nowMs(),
        mood: value,
      };
      const item: ExtractedItemRow = {
        id: makeId('itm'),
        entryId: entry.id,
        type: MOOD_ITEM_TYPE,
        payload: JSON.stringify(moodPayloadSchema.parse({ score: level.score, value, words: [], source: 'log' })),
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

    async setSmoothMotion(value) {
      set({ smoothMotion: value });
      await repo.setKv(KV_SMOOTH_MOTION, value ? '1' : '0');
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
      await cancelNudges().catch(() => {});
      set({
        entries: [],
        items: [],
        modules: [],
        suggestions: [],
        tasks: [],
        moods: [],
        listView: false,
        smoothMotion: true,
        panCenter: DEFAULT_PAN,
        clockOffsetMs: 0,
        unlockNotice: null,
        cheer: null,
        activeNudge: null,
        nudgesEnabled: false,
      });
    },
  };
});
