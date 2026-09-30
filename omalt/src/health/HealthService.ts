/**
 * The seam between Omalt and health data, like AIService. Implementations:
 *  - AppleHealthService: real HealthKit data (needs a development build, not Expo Go).
 *  - DemoHealthService: clearly labelled simulated data so the experience can be previewed anywhere.
 * Health data is read-only and stays on the device.
 */
export type HealthSourceKind = 'apple' | 'demo';

export interface HealthDay {
  /** Local date, yyyy-MM-dd. */
  day: string;
  steps?: number;
  /** Time asleep, attributed to the day the user woke up. */
  sleepHours?: number;
  restingHr?: number;
}

/** Synced daily values keyed by local date (yyyy-MM-dd). */
export type HealthDailyMap = Record<string, Omit<HealthDay, 'day'>>;

export interface HeartReading {
  bpm: number;
  /** ms since epoch */
  at: number;
}

export interface Availability {
  available: boolean;
  /** Plain-language reason when not available. */
  reason?: string;
}

export interface HealthService {
  readonly kind: HealthSourceKind;
  readonly label: string;
  availability(): Promise<Availability>;
  /** Asks for read permission. Resolves true if the user can proceed. */
  connect(): Promise<boolean>;
  /** Daily values for the last `days` days, today included. */
  fetchDays(days: number): Promise<HealthDay[]>;
  latestHeartRate(): Promise<HeartReading | null>;
}

export const SOURCE_LABELS: Record<HealthSourceKind, string> = {
  apple: 'Apple Health',
  demo: 'Demo data',
};
