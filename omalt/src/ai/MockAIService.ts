import {
  AIService,
  DetectedMood,
  DetectedTask,
  EntryAnalysis,
  MentionSignals,
  ModuleSuggestionCandidate,
} from './AIService';

export const TASK_SUGGESTION_THRESHOLD = 3;
export const MOOD_SUGGESTION_THRESHOLD = 1;

const TRIGGER =
  /\b(?:(?:i|we)\s+)?(?:(?:really|still|also|just|definitely)\s+)?(need to|needs to|have to|has to|got to|gotta|must|remember to|don'?t forget to|todo|to-do)\b:?/gi;

/** Words that end a task clause. */
const CLAUSE_END = /[.!?;\n]|,\s*(?:and|but|then)\b|\s+(?:and|but|then)\s+(?=(?:i|we)\b)/i;

const MOOD_LEXICON: Record<string, number> = {
  awful: 1, terrible: 1, miserable: 1, depressed: 1, devastated: 1, hopeless: 1, horrible: 1,
  sad: 2, down: 2, anxious: 2, stressed: 2, tired: 2, exhausted: 2, overwhelmed: 2, lonely: 2,
  upset: 2, angry: 2, worried: 2, low: 2, drained: 2, frustrated: 2, nervous: 2,
  okay: 3, ok: 3, fine: 3, meh: 3, alright: 3, neutral: 3, calm: 3, steady: 3,
  good: 4, happy: 4, glad: 4, content: 4, hopeful: 4, relaxed: 4, better: 4, grateful: 4,
  nice: 4, productive: 4, peaceful: 4, positive: 4,
  great: 5, amazing: 5, fantastic: 5, wonderful: 5, excited: 5, joyful: 5, ecstatic: 5,
  thrilled: 5, awesome: 5, energised: 5, energized: 5,
};

const FEELING_CUE = /\b(feel|feels|feeling|felt|i'?m|i am|im|mood|today was|day was|been)\b/i;
const NEGATORS = new Set(['not', "isn't", "wasn't", "aren't", "don't", 'never', 'no', 'hardly']);

function sentenceCase(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function cleanTaskText(raw: string): string {
  return sentenceCase(
    raw
      .replace(/^[\s:,-]+/, '')
      .replace(/\s+(and|but|then|so|because)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export function detectTasks(text: string): DetectedTask[] {
  const matches = [...text.matchAll(TRIGGER)];
  const tasks: DetectedTask[] = [];
  matches.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const nextTrigger = matches[i + 1]?.index ?? text.length;
    let rest = text.slice(start, nextTrigger);
    const end = rest.search(CLAUSE_END);
    if (end >= 0) rest = rest.slice(0, end);
    const cleaned = cleanTaskText(rest);
    // "must be nice" is a remark, not a task.
    if (cleaned.length < 2 || /^be\b/i.test(cleaned)) return;
    tasks.push({ text: cleaned.slice(0, 140), trigger: m[1].toLowerCase() });
  });
  return tasks;
}

export function detectMood(text: string): DetectedMood | null {
  const sentences = text.split(/[.!?\n;]+/);
  const scores: number[] = [];
  const words: string[] = [];
  for (const sentence of sentences) {
    const tokens = sentence.toLowerCase().match(/[a-z']+/g) ?? [];
    if (tokens.length === 0) continue;
    const hasCue = FEELING_CUE.test(sentence) || tokens.length <= 3;
    if (!hasCue) continue;
    tokens.forEach((tok, i) => {
      const base = MOOD_LEXICON[tok];
      if (base === undefined) return;
      const negated = i > 0 && NEGATORS.has(tokens[i - 1]);
      scores.push(negated ? 6 - base : base);
      words.push(negated ? `not ${tok}` : tok);
    });
  }
  if (scores.length === 0) return null;
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { score: Math.min(5, Math.max(1, Math.round(mean))), words };
}

export class MockAIService implements AIService {
  async analyzeEntry(text: string): Promise<EntryAnalysis> {
    return { tasks: detectTasks(text), mood: detectMood(text) };
  }

  async suggestModules(signals: MentionSignals): Promise<ModuleSuggestionCandidate[]> {
    const out: ModuleSuggestionCandidate[] = [];
    if (signals.taskMentions >= TASK_SUGGESTION_THRESHOLD) {
      out.push({
        moduleType: 'todo',
        reason: `You mentioned tasks ${signals.taskMentions} times. Would a to-do list help?`,
        mentionCount: signals.taskMentions,
        resurfaceAfter: TASK_SUGGESTION_THRESHOLD,
      });
    }
    if (signals.moodMentions >= MOOD_SUGGESTION_THRESHOLD) {
      out.push({
        moduleType: 'mood',
        reason: 'You wrote about how you feel. Would a mood tracker help?',
        mentionCount: signals.moodMentions,
        resurfaceAfter: 5,
      });
    }
    return out;
  }
}
