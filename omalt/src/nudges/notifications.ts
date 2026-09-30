import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NUDGES, nudgeById } from './nudges';

const CHANNEL_ID = 'nudges';
/** One nudge a day, at a random time in this window (local time). */
const EARLIEST_HOUR = 10;
const LATEST_HOUR = 19;
const DAYS_AHEAD = 7;

/** While the app is open the in-app card handles nudges, so don't also show a banner. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Gentle nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Replaces any scheduled nudges with a fresh random week: one per day, different prompts. */
export async function scheduleNudges(now: Date = new Date()): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();
  const order = shuffled(NUDGES);
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const when = new Date(now);
    when.setDate(when.getDate() + d);
    when.setHours(
      EARLIEST_HOUR + Math.floor(Math.random() * (LATEST_HOUR - EARLIEST_HOUR + 1)),
      Math.floor(Math.random() * 60),
      0,
      0,
    );
    if (when.getTime() < now.getTime() + 5 * 60 * 1000) continue;
    const nudge = order[d % order.length];
    await Notifications.scheduleNotificationAsync({
      content: { title: nudge.notification.title, body: nudge.notification.body, data: { nudgeId: nudge.id } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
    });
  }
}

export async function cancelNudges(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Schedules one nudge a few seconds from now, so the feature is easy to try. */
export async function scheduleTestNudge(seconds = 5): Promise<void> {
  await ensureChannel();
  const nudge = NUDGES[Math.floor(Math.random() * NUDGES.length)];
  await Notifications.scheduleNotificationAsync({
    content: { title: nudge.notification.title, body: nudge.notification.body, data: { nudgeId: nudge.id } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL_ID,
    },
  });
}

function nudgeIdFrom(data: unknown): string | null {
  const id = (data as { nudgeId?: unknown } | null | undefined)?.nudgeId;
  return typeof id === 'string' && nudgeById(id) ? id : null;
}

/**
 * Calls `onNudge` when a nudge notification arrives while the app is open, or is tapped
 * (including the tap that launched the app). Returns a cleanup function.
 */
export function listenForNudges(onNudge: (id: string) => void): () => void {
  const received = Notifications.addNotificationReceivedListener((n) => {
    const id = nudgeIdFrom(n.request.content.data);
    if (id) onNudge(id);
  });
  const tapped = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = nudgeIdFrom(r.notification.request.content.data);
    if (id) onNudge(id);
  });
  const launch = Notifications.getLastNotificationResponse();
  const launchId = launch ? nudgeIdFrom(launch.notification.request.content.data) : null;
  if (launchId) onNudge(launchId);
  return () => {
    received.remove();
    tapped.remove();
  };
}
