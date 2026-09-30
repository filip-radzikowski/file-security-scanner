import { format, startOfDay, subDays } from 'date-fns';
import type { Availability, HealthDay, HealthService, HeartReading } from './HealthService';

/** Stable pseudo-random number in [0, 1) from a string. */
function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** Simulated numbers, so the synced experience can be previewed without a phone full of health data. */
export class DemoHealthService implements HealthService {
  readonly kind = 'demo' as const;
  readonly label = 'Demo data';
  private bpm = 68;

  async availability(): Promise<Availability> {
    return { available: true };
  }

  async connect(): Promise<boolean> {
    return true;
  }

  async fetchDays(days: number): Promise<HealthDay[]> {
    const today = startOfDay(new Date());
    const out: HealthDay[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = format(subDays(today, i), 'yyyy-MM-dd');
      out.push({
        day,
        steps: Math.round(3500 + unit(`s${day}`) * 9000),
        sleepHours: Math.round((5.5 + unit(`z${day}`) * 3) * 10) / 10,
        restingHr: Math.round(54 + unit(`r${day}`) * 10),
      });
    }
    return out;
  }

  /** A gentle random walk between 58 and 96 bpm. */
  async latestHeartRate(): Promise<HeartReading> {
    this.bpm = Math.min(96, Math.max(58, this.bpm + Math.round((Math.random() - 0.5) * 10)));
    return { bpm: this.bpm, at: Date.now() };
  }
}
