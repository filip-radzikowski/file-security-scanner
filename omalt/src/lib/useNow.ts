import { useEffect, useState } from 'react';
import { useOmaltStore } from '../store/useOmaltStore';

/** Current time in ms (including any testing clock offset), refreshed on an interval. */
export function useNow(intervalMs = 30000): number {
  const offset = useOmaltStore((s) => s.clockOffsetMs);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  // Recompute when the offset changes even if the interval has not fired.
  return (offset === 0 ? tick : Date.now()) + offset;
}
