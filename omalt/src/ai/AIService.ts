/**
 * The seam between Omalt and "intelligence". Phase 1 ships a keyword-based mock;
 * a real model-backed implementation can replace it without touching callers.
 * Implementations must never require API keys to be bundled in the app.
 */

export interface DetectedTask {
  /** Cleaned, sentence-cased task text. */
  text: string;
  /** The phrase that triggered detection (e.g. "need to"). */
  trigger: string;
}

export interface DetectedMood {
  /** 1 (low) to 5 (great). */
  score: number;
  words: string[];
}

/** Everyday topics the mock can pick out of free text. */
export type TopicType = 'weather' | 'sleep' | 'steps' | 'workout' | 'heart';

export interface DetectedTopic {
  type: TopicType;
  /** Hours slept, step count, etc. when the text gave a number. */
  value?: number;
  /** e.g. the weather condition ("rainy"). */
  label?: string;
}

export interface EntryAnalysis {
  tasks: DetectedTask[];
  mood: DetectedMood | null;
  topics: DetectedTopic[];
}

export interface Reflection {
  /** A short, kind response to what was written. */
  reflection: string;
  /** A gentle question that invites the user to write more. */
  followUpPrompt: string;
}

/** Running totals across all of the user's entries. */
export interface MentionSignals {
  taskMentions: number;
  moodMentions: number;
  /** Mentions per topic module type ('weather' | 'sleep' | 'steps'). */
  topicMentions: Record<string, number>;
}

export interface ModuleSuggestionCandidate {
  moduleType: string;
  /** Human-readable reason shown on the suggestion card. */
  reason: string;
  mentionCount: number;
  /** After a "Not now", re-suggest once mentions grow by this many. */
  resurfaceAfter: number;
}

export interface AIService {
  analyzeEntry(text: string): Promise<EntryAnalysis>;
  suggestModules(signals: MentionSignals): Promise<ModuleSuggestionCandidate[]>;
  reflectOnEntry(text: string): Promise<Reflection>;
}
