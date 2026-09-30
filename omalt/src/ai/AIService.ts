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

export interface EntryAnalysis {
  tasks: DetectedTask[];
  mood: DetectedMood | null;
}

/** Running totals across all of the user's entries. */
export interface MentionSignals {
  taskMentions: number;
  moodMentions: number;
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
}
