import {
  AIService,
  DetectedMood,
  DetectedTask,
  DetectedTopic,
  EntryAnalysis,
  MentionSignals,
  ModuleSuggestionCandidate,
  Reflection,
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

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const WEATHER_STRONG: Record<string, string> = {
  sunny: 'sunny', sunshine: 'sunny', cloudy: 'cloudy', overcast: 'cloudy', rainy: 'rainy', raining: 'rainy',
  drizzle: 'rainy', drizzling: 'rainy', stormy: 'stormy', thunder: 'stormy', thunderstorm: 'stormy',
  snowy: 'snowy', snowing: 'snowy', windy: 'windy',
};
const WEATHER_SOFT: Record<string, string> = { hot: 'hot', cold: 'cold', freezing: 'cold', warm: 'hot', rain: 'rainy', snow: 'snowy', wind: 'windy', sun: 'sunny' };
const WEATHER_CUE = /\b(weather|forecast|outside|outdoors|it's|its|it is|today is)\b/i;

export function detectTopics(text: string): DetectedTopic[] {
  const topics: DetectedTopic[] = [];
  // Split on sentence punctuation, but not on the dot in a number like 7.5.
  const sentences = text.split(/[.!?;\n]+(?=\s|$)/);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const tokens = lower.match(/[a-z']+/g) ?? [];

    // weather
    if (!topics.some((t) => t.type === 'weather')) {
      let condition: string | undefined;
      for (const tok of tokens) {
        if (WEATHER_STRONG[tok]) condition = WEATHER_STRONG[tok];
        else if (!condition && WEATHER_CUE.test(sentence) && WEATHER_SOFT[tok]) condition = WEATHER_SOFT[tok];
        if (condition && WEATHER_STRONG[tok]) break;
      }
      if (condition || /\b(weather|forecast)\b/.test(lower)) topics.push({ type: 'weather', label: condition });
    }

    // sleep
    if (/\b(slept|sleep|sleeping|asleep|nap|napped|insomnia|bedtime|went to bed)\b/.test(lower)) {
      let hours: number | undefined;
      const num = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
      const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+hours?\b/);
      if (num) hours = parseFloat(num[1]);
      else if (word) hours = WORD_NUMBERS[word[1]];
      if (hours !== undefined && (hours <= 0 || hours > 16)) hours = undefined;
      const known = topics.find((t) => t.type === 'sleep');
      if (known) known.value ??= hours;
      else topics.push({ type: 'sleep', value: hours });
    }

    // "70% rested" / "rested 70%" can sit in a separate sentence from the hours
    if (/(\d{1,3})\s*%\s*(?:rested|refreshed|energi[sz]ed)|(?:rested|refreshed)\D{0,12}(\d{1,3})\s*%/.test(lower)) {
      const m = lower.match(/(\d{1,3})\s*%\s*(?:rested|refreshed|energi[sz]ed)|(?:rested|refreshed)\D{0,12}(\d{1,3})\s*%/);
      const n = parseInt((m?.[1] ?? m?.[2]) as string, 10);
      if (n >= 0 && n <= 100) {
        const existing = topics.find((t) => t.type === 'sleep');
        if (existing) existing.rested = n;
        else topics.push({ type: 'sleep', rested: n });
      }
    }

    // steps
    if (!topics.some((t) => t.type === 'steps')) {
      const m = lower.match(/(\d[\d,]*(?:\.\d+)?)\s*(k)?\s*steps?\b/);
      if (m) {
        const n = parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1);
        topics.push({ type: 'steps', value: n > 0 && n < 200000 ? Math.round(n) : undefined });
      } else if (/\b(walk|walked|walking|steps|jog|jogged|hike|hiked)\b/.test(lower)) {
        topics.push({ type: 'steps' });
      }
    }

    // heart rate
    if (!topics.some((t) => t.type === 'heart')) {
      const bpm = lower.match(/(\d{2,3})\s*bpm\b/);
      if (bpm) {
        const n = parseInt(bpm[1], 10);
        topics.push({ type: 'heart', value: n >= 30 && n <= 220 ? n : undefined });
      } else if (/\b(heart rate|heartrate|pulse|resting heart|heart was racing|heart racing)\b/.test(lower)) {
        topics.push({ type: 'heart' });
      }
    }

    // workout (only when it actually happened)
    if (
      !topics.some((t) => t.type === 'workout') &&
      /\b(gym|workout|worked out|work out|exercise|exercised|lifting|lifted|swim|swam|yoga|pilates|ran|went for a run|jogged)\b/.test(lower) &&
      !/\b(didn'?t|did not|haven'?t|skipped|missed|no|not|won'?t|wasn'?t)\b/.test(lower)
    ) {
      topics.push({ type: 'workout' });
    }
  }
  return topics;
}

const TOPIC_SUGGESTIONS: Record<string, { reason: string }> = {
  weather: { reason: 'You mentioned the weather. Want a weather log?' },
  sleep: { reason: 'You mentioned your sleep. Want to track it?' },
  steps: { reason: 'You mentioned walking and steps. Want a step tracker?' },
  heart: { reason: 'You mentioned your heart rate. Want a heart tile that pulses with it?' },
};

export class MockAIService implements AIService {
  async analyzeEntry(text: string): Promise<EntryAnalysis> {
    return { tasks: detectTasks(text), mood: detectMood(text), topics: detectTopics(text) };
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
    for (const [type, { reason }] of Object.entries(TOPIC_SUGGESTIONS)) {
      const n = signals.topicMentions[type] ?? 0;
      if (n >= 1) out.push({ moduleType: type, reason, mentionCount: n, resurfaceAfter: 5 });
    }
    return out;
  }

  async reflectOnEntry(text: string): Promise<Reflection> {
    const tasks = detectTasks(text);
    const mood = detectMood(text);
    const topics = detectTopics(text);
    const has = (t: string) => topics.some((x) => x.type === t);

    if (tasks.length > 0) {
      return {
        reflection:
          tasks.length === 1
            ? `There is one thing on your plate here: "${tasks[0].text}". It's already on your to-do list. Small, clear tasks tend to feel lighter once they're written down.`
            : `That's ${tasks.length} things on your plate. I've noted them for you. Naming them is half of getting them done.`,
        followUpPrompt: 'Which one would feel best to finish first?',
      };
    }
    if (mood && mood.score <= 2) {
      return {
        reflection: 'That sounds like a heavy moment. Thank you for putting it into words; that takes a bit of courage.',
        followUpPrompt: "What's one small thing that might help, even a little?",
      };
    }
    if (mood && mood.score >= 4) {
      return {
        reflection: 'It is good to catch a bright moment and write it down. You can come back to this on a harder day.',
        followUpPrompt: 'What do you think helped you feel this way?',
      };
    }
    if (has('workout')) {
      return {
        reflection: 'Moving your body counts, however it went. Showing up is the hard part.',
        followUpPrompt: 'How did you feel afterwards?',
      };
    }
    if (has('sleep')) {
      return {
        reflection: 'Sleep quietly shapes the whole day. Noting it helps you spot patterns over time.',
        followUpPrompt: 'How rested do you feel right now?',
      };
    }
    if (has('steps')) {
      return {
        reflection: 'Walking is an underrated way to clear your head.',
        followUpPrompt: 'Where did you walk, and what was it like?',
      };
    }
    if (has('weather')) {
      return {
        reflection: 'Weather sneaks into our moods more than we notice.',
        followUpPrompt: 'Does it change how you want to spend today?',
      };
    }
    return {
      reflection: 'Thanks for putting that down. Writing things out often makes them feel a bit lighter.',
      followUpPrompt: 'Want to say more about it?',
    };
  }
}
