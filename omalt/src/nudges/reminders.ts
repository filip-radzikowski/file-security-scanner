import { NUDGES } from './nudges';

/**
 * Notification reminders come in several kinds, each with its own switch. The planner is a
 * pure function (state in, schedule out) so it is easy to test; notifications.ts does the
 * actual scheduling.
 */
export type ReminderCategory = 'checkins' | 'sleep' | 'evening' | 'tasks' | 'streak' | 'milestones';

export const REMINDER_CATEGORIES: { id: ReminderCategory; label: string; description: string }[] = [
  { id: 'checkins', label: 'Daily check-in', description: 'One random quick question a day, like the weather or the gym.' },
  { id: 'sleep', label: 'Morning sleep check-in', description: 'Around 8:30, to log how you slept.' },
  { id: 'evening', label: 'Evening reflection', description: 'Around 8:30 pm: how was today?' },
  { id: 'tasks', label: 'Task reminders', description: 'Around 5:30 pm when you still have open tasks.' },
  { id: 'streak', label: 'Streak keeper', description: 'At 9 pm, only when you are on a streak and have not written yet.' },
  { id: 'milestones', label: 'Unlocks and weekly recap', description: 'When something unlocks, and a look back on Sunday evening.' },
];

export type ReminderPrefs = Record<ReminderCategory, boolean>;

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  checkins: true,
  sleep: true,
  evening: true,
  tasks: true,
  streak: true,
  milestones: true,
};

export interface ReminderContext {
  prefs: ReminderPrefs;
  openTasks: number;
  /** Consecutive days written, counting today if already written. */
  streak: number;
  wroteToday: boolean;
  /** Time-based unlocks still to come. */
  unlocks: { moduleType: string; title: string; at: number }[];
}

export interface PlannedReminder {
  /** Stable id, so a reminder can be cancelled later (e.g. today's streak nudge once you write). */
  id: string;
  at: Date;
  title: string;
  body: string;
  /** Delivered with the notification: which check-in to show, or which module to open. */
  data: { nudgeId?: string; openModuleType?: string };
}

const DAYS_AHEAD = 7;
const MIN_LEAD_MS = 5 * 60 * 1000;
const CLASH_MS = 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function at(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function planReminders(ctx: ReminderContext, now: Date = new Date(), rand: () => number = Math.random): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  const earliest = now.getTime() + MIN_LEAD_MS;
  const push = (r: PlannedReminder) => {
    if (r.at.getTime() >= earliest) out.push(r);
  };
  const jitter = (max: number) => Math.floor(rand() * (max + 1));
  const { prefs } = ctx;

  // Fixed-time reminders first, so the random check-in can steer clear of them.
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const key = ymd(day);

    if (prefs.sleep) {
      push({
        id: `sleep-${key}`,
        at: at(day, 8, 30 + jitter(20)),
        title: 'Good morning',
        body: 'How did you sleep? Tap to log it.',
        data: { nudgeId: 'sleep' },
      });
    }

    const streakToday = prefs.streak && ctx.streak >= 2 && !(d === 0 && ctx.wroteToday);
    if (streakToday) {
      push({
        id: `streak-${key}`,
        at: at(day, 21, jitter(10)),
        title: 'Keep your streak going',
        body: d === 0 ? `You're on a ${ctx.streak}-day streak. One line today keeps it alive.` : 'One line today is enough to keep your streak going.',
        data: { nudgeId: 'streak' },
      });
    } else if (prefs.evening) {
      // A streak reminder already covers the evening on streak days.
      push({
        id: `evening-${key}`,
        at: at(day, 20, 15 + jitter(20)),
        title: 'Omalt',
        body: 'How was today? One line is enough.',
        data: { nudgeId: 'evening' },
      });
    }

    if (prefs.tasks && ctx.openTasks > 0 && d <= 2) {
      push({
        id: `tasks-${key}`,
        at: at(day, 17, 25 + jitter(10)),
        title: 'Your to-do list',
        body:
          d === 0
            ? `You have ${ctx.openTasks} open task${ctx.openTasks === 1 ? '' : 's'}. Want to tick one off?`
            : 'You still have tasks open. Pick the smallest one.',
        data: { nudgeId: 'tasks-open' },
      });
    }
  }

  if (prefs.milestones) {
    for (const u of ctx.unlocks) {
      const when = new Date(u.at);
      if (when.getTime() - now.getTime() <= 14 * 86400000) {
        push({
          id: `unlock-${u.moduleType}`,
          at: when,
          title: `${u.title} is unlocked`,
          body: `${u.title} is ready on your canvas. Tap to take a look.`,
          data: { openModuleType: u.moduleType },
        });
      }
    }
    // Sunday 6 pm, the next one that is still ahead.
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);
      if (day.getDay() === 0) {
        push({
          id: `recap-${ymd(day)}`,
          at: at(day, 18, 0),
          title: 'Your week in Omalt',
          body: 'Take a look back at how the week went.',
          data: { nudgeId: 'recap' },
        });
        break;
      }
    }
  }

  // One random check-in a day (skipped on busy days), between 10:00 and 19:59, at least an hour from anything else.
  if (prefs.checkins) {
    const pool = shuffled(
      NUDGES.filter((n) => !(prefs.sleep && n.id === 'sleep')),
      rand,
    );
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const day = new Date(now);
      day.setDate(day.getDate() + d);
      const sameDay = out.filter((r) => ymd(r.at) === ymd(day)).map((r) => r.at.getTime());
      // Never more than three a day: the random check-in is the first to go on a busy day.
      if (sameDay.length >= 3) continue;
      let when: Date | null = null;
      for (let attempt = 0; attempt < 12 && !when; attempt++) {
        const c = at(day, 10 + Math.floor(rand() * 10), Math.floor(rand() * 60));
        if (sameDay.every((t) => Math.abs(t - c.getTime()) >= CLASH_MS)) when = c;
      }
      if (!when) continue;
      const nudge = pool[d % pool.length];
      push({
        id: `checkin-${ymd(day)}`,
        at: when,
        title: nudge.notification.title,
        body: nudge.notification.body,
        data: { nudgeId: nudge.id },
      });
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
