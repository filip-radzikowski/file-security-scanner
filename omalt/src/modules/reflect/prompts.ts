import type { ReflectPrefs } from './schema';

export interface PromptTheme {
  id: string;
  label: string;
  prompts: string[];
}

/** Built-in reflection prompts, grouped by theme. The user picks which themes they want. */
export const PROMPT_THEMES: PromptTheme[] = [
  {
    id: 'wins',
    label: 'Wins',
    prompts: [
      'What went well this week?',
      'What are you proud of, even if it was small?',
      'What did you finish or make progress on?',
      'When did you feel most like yourself?',
    ],
  },
  {
    id: 'gratitude',
    label: 'Gratitude',
    prompts: [
      "What are you grateful for right now?",
      'Who made your week better, and how?',
      'What small moment do you want to remember?',
      'What is something ordinary you would miss if it were gone?',
    ],
  },
  {
    id: 'challenges',
    label: 'Challenges',
    prompts: [
      'What was hardest this week, and how did you handle it?',
      'What drained your energy?',
      'What is weighing on your mind?',
      'What would you tell a friend who had the week you had?',
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    prompts: [
      'What did you learn about yourself?',
      'What would you do differently next time?',
      'What is one thing you want to work on next week?',
      'What habit is helping you, and what is getting in the way?',
    ],
  },
  {
    id: 'people',
    label: 'People',
    prompts: [
      'Who do you want to reach out to?',
      'How did your time with other people leave you feeling?',
      'Is there a conversation you have been putting off?',
      'Who has helped you lately, and have you told them?',
    ],
  },
  {
    id: 'body',
    label: 'Body & energy',
    prompts: [
      'How has your body felt this week?',
      'What gave you energy, and what took it away?',
      'How did your sleep, food and movement affect your mood?',
      'What would rest look like for you right now?',
    ],
  },
];

export const FALLBACK_PROMPT = 'What is on your mind this week?';

/** Every prompt the user's choices allow: their custom ones first, then the chosen themes. */
export function promptPool(prefs: ReflectPrefs): string[] {
  const fromThemes = PROMPT_THEMES.filter((t) => prefs.themes.includes(t.id)).flatMap((t) => t.prompts);
  const pool = [...prefs.custom, ...fromThemes];
  return pool.length > 0 ? pool : [FALLBACK_PROMPT];
}

/** A stable starting point for the week (so the prompt does not change every time the screen opens). */
export function weekSeed(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + now.getFullYear();
}
