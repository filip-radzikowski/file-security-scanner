import type { ModuleSuggestionCandidate } from '../ai';
import type { ModuleRecord, Suggestion } from '../db/schema';
import { makeId } from '../lib/ids';

/**
 * Merges fresh AI candidates into stored suggestions. Returns only the rows that
 * need writing.
 * - a module of that type already exists -> nothing to suggest
 * - pending -> refresh the count and reason
 * - accepted -> never suggest again
 * - dismissed ("Not now") -> resurface only after enough new mentions
 */
export function reconcileSuggestions(
  candidates: ModuleSuggestionCandidate[],
  existing: Suggestion[],
  modules: ModuleRecord[],
): Suggestion[] {
  const writes: Suggestion[] = [];
  for (const c of candidates) {
    if (modules.some((m) => m.type === c.moduleType)) continue;
    const current = existing.find((s) => s.moduleType === c.moduleType);
    if (!current) {
      writes.push({
        id: makeId('sug'),
        moduleType: c.moduleType,
        reason: c.reason,
        mentionCount: c.mentionCount,
        status: 'pending',
      });
    } else if (current.status === 'pending') {
      if (current.mentionCount !== c.mentionCount || current.reason !== c.reason) {
        writes.push({ ...current, reason: c.reason, mentionCount: c.mentionCount });
      }
    } else if (current.status === 'dismissed' && c.mentionCount >= current.mentionCount + c.resurfaceAfter) {
      writes.push({ ...current, reason: c.reason, mentionCount: c.mentionCount, status: 'pending' });
    }
  }
  return writes;
}
