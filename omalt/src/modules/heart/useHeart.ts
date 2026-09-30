import { useEffect, useMemo } from 'react';
import type { HealthSourceKind } from '../../health';
import { useOmaltStore } from '../../store/useOmaltStore';
import { deriveHeart } from './schema';

export interface HeartNow {
  bpm: number;
  at: number;
  source: HealthSourceKind | 'manual';
}

/**
 * The heart rate to show: a live reading from a connected source (re-read every 15s while a
 * heart tile is on screen), otherwise the last rate the user typed into their diary.
 */
export function useHeart(poll = true): HeartNow | null {
  const source = useOmaltStore((s) => s.healthSource);
  const heart = useOmaltStore((s) => s.heart);
  const refreshHeart = useOmaltStore((s) => s.refreshHeart);
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);

  useEffect(() => {
    if (!source || !poll) return;
    refreshHeart();
    const id = setInterval(refreshHeart, 15000);
    return () => clearInterval(id);
  }, [source, poll, refreshHeart]);

  const manual = useMemo(() => {
    const all = deriveHeart(items, entries).filter((p) => p.data.bpm !== undefined);
    const last = all[all.length - 1];
    return last ? { bpm: last.data.bpm as number, at: last.createdAt, source: 'manual' as const } : null;
  }, [items, entries]);

  if (source && heart) return { bpm: heart.bpm, at: heart.at, source };
  return manual;
}
