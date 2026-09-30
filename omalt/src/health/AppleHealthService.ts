import Constants, { ExecutionEnvironment } from 'expo-constants';
import { addDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { Platform } from 'react-native';
import type { Availability, HealthDay, HealthService, HeartReading } from './HealthService';

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

/**
 * The native library is only present in a development build, so it is loaded lazily and
 * any failure simply means "not available here". Expo Go never gets past the first check.
 */
function loadHealthKit(): HealthKitModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch {
    return null;
  }
}

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const HEART = 'HKQuantityTypeIdentifierHeartRate' as const;
const RESTING = 'HKQuantityTypeIdentifierRestingHeartRate' as const;
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

/** HKCategoryValueSleepAnalysis: 0 inBed, 1 asleep(unspecified), 2 awake, 3 core, 4 deep, 5 REM. */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

const dayKey = (d: Date | number) => format(d, 'yyyy-MM-dd');

/** Total length of a set of intervals, counting overlaps once (watch and phone can both record). */
function mergedHours(intervals: [number, number][]): number {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const [s, e] of sorted) {
    if (curEnd < 0 || s > curEnd) {
      if (curEnd >= 0) total += curEnd - curStart;
      curStart = s;
      curEnd = e;
    } else {
      curEnd = Math.max(curEnd, e);
    }
  }
  if (curEnd >= 0) total += curEnd - curStart;
  return total / 3600000;
}

export class AppleHealthService implements HealthService {
  readonly kind = 'apple' as const;
  readonly label = 'Apple Health';

  async availability(): Promise<Availability> {
    if (Platform.OS !== 'ios') {
      return { available: false, reason: 'Apple Health is only on iPhone. Android support (Health Connect) is not built yet.' };
    }
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return {
        available: false,
        reason: 'Apple Health needs a development build of Omalt. It cannot run inside Expo Go.',
      };
    }
    const hk = loadHealthKit();
    if (!hk) return { available: false, reason: 'The HealthKit module is not part of this build.' };
    try {
      return (await hk.isHealthDataAvailableAsync())
        ? { available: true }
        : { available: false, reason: 'Health data is not available on this device.' };
    } catch {
      return { available: false, reason: 'Could not reach Apple Health on this device.' };
    }
  }

  async connect(): Promise<boolean> {
    const hk = loadHealthKit();
    if (!hk) return false;
    return hk.requestAuthorization({ toRead: [STEPS, HEART, RESTING, SLEEP] });
  }

  async fetchDays(days: number): Promise<HealthDay[]> {
    const hk = loadHealthKit();
    if (!hk) return [];
    const now = new Date();
    const first = startOfDay(subDays(now, days - 1));
    const byDay = new Map<string, HealthDay>();
    const slot = (d: Date | number) => {
      const key = dayKey(d);
      let v = byDay.get(key);
      if (!v) byDay.set(key, (v = { day: key }));
      return v;
    };
    const dateFilter = { date: { startDate: first, endDate: endOfDay(now) } };

    // Steps: one cumulative sum per day.
    const steps = await hk.queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], first, { day: 1 }, {
      filter: dateFilter,
      unit: 'count',
    });
    for (const s of steps) {
      if (s.startDate && s.sumQuantity) slot(s.startDate).steps = Math.round(s.sumQuantity.quantity);
    }

    // Resting heart rate: daily average.
    const resting = await hk.queryStatisticsCollectionForQuantity(RESTING, ['discreteAverage'], first, { day: 1 }, {
      filter: dateFilter,
      unit: 'count/min',
    });
    for (const r of resting) {
      if (r.startDate && r.averageQuantity) slot(r.startDate).restingHr = Math.round(r.averageQuantity.quantity);
    }

    // Sleep: asleep intervals, merged, credited to the day the user woke up. Start the query
    // the evening before so the first night is whole.
    const samples = await hk.queryCategorySamples(SLEEP, {
      limit: 0,
      ascending: true,
      filter: { date: { startDate: subDays(first, 1), endDate: endOfDay(addDays(now, 0)) } },
    });
    const perDay = new Map<string, [number, number][]>();
    for (const s of samples) {
      if (!ASLEEP_VALUES.has(Number(s.value))) continue;
      const key = dayKey(s.endDate);
      const list = perDay.get(key) ?? [];
      list.push([s.startDate.getTime(), s.endDate.getTime()]);
      perDay.set(key, list);
    }
    for (const [key, list] of perDay) {
      const hours = mergedHours(list);
      if (hours > 0 && byDay.has(key)) byDay.get(key)!.sleepHours = Math.round(hours * 10) / 10;
    }

    return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  }

  async latestHeartRate(): Promise<HeartReading | null> {
    const hk = loadHealthKit();
    if (!hk) return null;
    const samples = await hk.queryQuantitySamples(HEART, { limit: 1, ascending: false, unit: 'count/min' });
    const s = samples[0];
    return s ? { bpm: Math.round(s.quantity), at: s.endDate.getTime() } : null;
  }
}
