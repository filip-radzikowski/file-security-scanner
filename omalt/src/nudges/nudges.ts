/**
 * Gentle prompts Omalt offers "from time to time", in the app and as notifications.
 * Every answer becomes an ordinary diary entry, so the usual detection (tasks, mood,
 * weather, sleep, steps) and module suggestions keep working.
 */
export type NudgeKind = 'choice' | 'yesno' | 'text' | 'notify' | 'open';

export interface Nudge {
  id: string;
  kind: NudgeKind;
  prompt: string;
  notification: { title: string; body: string };
  /** kind "choice": tapping a choice writes `sentence` to the diary. */
  choices?: { label: string; sentence: string }[];
  /** kind "yesno": the answer, then an optional "tell me more" box. */
  yes?: { sentence: string; askMore: string };
  no?: { sentence: string; askMore: string };
  /** kind "open": a button that opens a module (used by task and recap reminders). */
  open?: { moduleType: string; label: string };
  /** kind "text": a box; `toSentence` turns the typed text into the diary entry. */
  text?: { placeholder: string; numeric?: boolean; toSentence: (t: string) => string };
}

export const NUDGES: Nudge[] = [
  {
    id: 'weather',
    kind: 'choice',
    prompt: "How's the weather where you are?",
    notification: { title: 'Omalt', body: "How's the weather? Tap to add it to your diary." },
    choices: [
      { label: 'Sunny', sentence: "It's sunny today." },
      { label: 'Cloudy', sentence: "It's cloudy today." },
      { label: 'Rainy', sentence: "It's rainy today." },
      { label: 'Windy', sentence: "It's windy today." },
      { label: 'Snowy', sentence: "It's snowy today." },
    ],
  },
  {
    id: 'gym',
    kind: 'yesno',
    prompt: 'Did you go to the gym today?',
    notification: { title: 'Omalt', body: 'Did you go to the gym today? Tell me about it.' },
    yes: { sentence: 'Went to the gym today.', askMore: 'What did you do? (optional)' },
    no: { sentence: "Didn't make it to the gym today.", askMore: 'What got in the way? (optional)' },
  },
  {
    id: 'sleep',
    kind: 'choice',
    prompt: 'How did you sleep last night?',
    notification: { title: 'Omalt', body: 'How did you sleep last night? Tap to note it.' },
    choices: [
      { label: 'Badly', sentence: 'Slept badly last night.' },
      { label: 'Okay', sentence: 'Slept okay last night.' },
      { label: 'Well', sentence: 'Slept well last night.' },
    ],
  },
  {
    id: 'steps',
    kind: 'text',
    prompt: 'Roughly how many steps have you done today?',
    notification: { title: 'Omalt', body: 'How many steps so far today? A rough guess is fine.' },
    text: {
      placeholder: 'e.g. 4200',
      numeric: true,
      toSentence: (t) => {
        const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
        return Number.isFinite(n) && n > 0 ? `Walked ${n} steps today.` : `Walked a bit today. ${t}`;
      },
    },
  },
  {
    id: 'plan',
    kind: 'text',
    prompt: "What's one thing you want to get done today?",
    notification: { title: 'Omalt', body: "What's one thing you want to get done today?" },
    text: { placeholder: 'One small thing', toSentence: (t) => `Today I need to ${t.replace(/^to\s+/i, '')}.` },
  },
  {
    id: 'grateful',
    kind: 'text',
    prompt: "What's one small thing you're grateful for today?",
    notification: { title: 'Omalt', body: "What's one small thing you're grateful for today?" },
    text: { placeholder: 'Something small', toSentence: (t) => `Grateful for ${t}.` },
  },
  {
    id: 'energy',
    kind: 'choice',
    prompt: "How's your energy right now?",
    notification: { title: 'Omalt', body: "How's your energy right now? Tap to check in." },
    choices: [
      { label: 'Low', sentence: 'I feel drained right now.' },
      { label: 'Steady', sentence: 'I feel steady right now.' },
      { label: 'High', sentence: 'I feel energised right now.' },
    ],
  },
  {
    id: 'water',
    kind: 'yesno',
    prompt: 'Have you had some water lately?',
    notification: { title: 'Omalt', body: 'Have you had some water lately? A small sip counts.' },
    yes: { sentence: 'Had some water today.', askMore: 'Anything else on your mind? (optional)' },
    no: { sentence: "Haven't had water in a while.", askMore: 'Anything else on your mind? (optional)' },
  },
];

/**
 * Prompts that notification reminders point at. They are not in the random pool: each is
 * tied to a specific reminder (evening reflection, streak keeper, task and weekly recap).
 */
export const EXTRA_NUDGES: Nudge[] = [
  {
    id: 'evening',
    kind: 'text',
    prompt: 'How was today? One line is enough.',
    notification: { title: 'Omalt', body: 'How was today? One line is enough.' },
    text: { placeholder: 'One line about today', toSentence: (t) => `Today: ${t}` },
  },
  {
    id: 'streak',
    kind: 'text',
    prompt: "Keep your streak going. What's one thing from today?",
    notification: { title: 'Omalt', body: 'One line today keeps your streak going.' },
    text: { placeholder: 'One thing from today', toSentence: (t) => `Today: ${t}` },
  },
  {
    id: 'tasks-open',
    kind: 'open',
    prompt: "You've still got open tasks. Want to tick one off?",
    notification: { title: 'Your to-do list', body: 'You have open tasks.' },
    open: { moduleType: 'todo', label: 'Open to-do' },
  },
  {
    id: 'recap',
    kind: 'open',
    prompt: "It's the end of the week. Want a look back at how it went?",
    notification: { title: 'Your week in Omalt', body: 'Take a look back.' },
    open: { moduleType: 'reflect', label: 'Open Reflect' },
  },
];

/** Shown once, in the app only, to offer notifications. Not part of the random pool. */
export const NOTIFY_NUDGE: Nudge = {
  id: 'enable-notifications',
  kind: 'notify',
  prompt: 'Want a gentle nudge now and then, even when the app is closed? One quick question a day, never more.',
  notification: { title: 'Omalt', body: '' },
};

export function nudgeById(id: string): Nudge | undefined {
  if (id === NOTIFY_NUDGE.id) return NOTIFY_NUDGE;
  return NUDGES.find((n) => n.id === id) ?? EXTRA_NUDGES.find((n) => n.id === id);
}

/** A nudge that suits the time of day: the sleep question in the morning, a reflection in the evening. */
export function timeOfDayNudge(hour: number): Nudge | null {
  if (hour >= 5 && hour < 11) return nudgeById('sleep') ?? null;
  if (hour >= 19 && hour < 23) return nudgeById('evening') ?? null;
  return null;
}

/** A random nudge that wasn't shown recently. */
export function pickNudge(exclude: string[], rand: () => number = Math.random): Nudge {
  const pool = NUDGES.filter((n) => !exclude.includes(n.id));
  const from = pool.length > 0 ? pool : NUDGES;
  return from[Math.floor(rand() * from.length)];
}
