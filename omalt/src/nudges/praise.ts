import type { DetectedTopic, EntryAnalysis } from '../ai';
import { STEPS_GOAL } from '../modules/steps/schema';

export interface PraiseContext {
  /** Entries including the one just written. */
  entryCount: number;
  analysis: EntryAnalysis;
  /** Consecutive days written, including today. */
  streak: number;
  /** True if this is the first entry of the day. */
  firstToday: boolean;
  /** 0-100 mood for the entry, if any. */
  moodValue: number | null;
}

const STREAK_MILESTONES = new Set([3, 7, 14, 30, 60, 100]);

const GENERIC = [
  'Saved. Thanks for showing up.',
  'Written down. That is a good habit.',
  'Noted. Keep going, I am listening.',
  'Got it. It is nice to have this somewhere.',
];

function topic(analysis: EntryAnalysis, type: DetectedTopic['type']): DetectedTopic | undefined {
  return analysis.topics.find((t) => t.type === type);
}

/** One short, warm line reacting to what was just written. Most specific reaction wins. */
export function praiseForEntry(ctx: PraiseContext): string {
  const { analysis, streak, firstToday, moodValue, entryCount } = ctx;

  const steps = topic(analysis, 'steps')?.value;
  if (steps !== undefined && steps >= STEPS_GOAL) {
    return `${steps.toLocaleString()} steps. That's a proper day of walking. Well done!`;
  }
  if (topic(analysis, 'workout')) {
    return 'You made it to the gym. That is the hard part, so well done!';
  }
  const sleep = topic(analysis, 'sleep')?.value;
  if (sleep !== undefined && sleep >= 7) {
    return `${sleep} hours of sleep. Lovely, that's a great base for the day.`;
  }
  if (firstToday && STREAK_MILESTONES.has(streak)) {
    return `${streak} days in a row! I love that you keep coming back.`;
  }
  if (moodValue !== null && moodValue >= 70) {
    return "Love that you're feeling good. Hold on to this one.";
  }
  if (sleep !== undefined && sleep < 6) {
    return 'A short night. Be kind to yourself today.';
  }
  if (moodValue !== null && moodValue <= 30) {
    return "Thank you for being honest about it. Small steps still count.";
  }
  if (steps !== undefined && steps > 0) {
    return `${steps.toLocaleString()} steps so far. Every bit adds up.`;
  }
  if (analysis.tasks.length > 0) {
    const n = analysis.tasks.length;
    return `Got it. I've noted ${n} task${n === 1 ? '' : 's'} for you.`;
  }
  return GENERIC[entryCount % GENERIC.length];
}

export function praiseForTask(doneToday: number, openLeft: number): string {
  if (openLeft === 0) return 'All tasks done. Go enjoy that feeling!';
  if (doneToday === 1) return 'One down. Nice start!';
  return `Nice. That's ${doneToday} done today.`;
}
