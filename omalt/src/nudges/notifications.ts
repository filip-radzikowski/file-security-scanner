import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NUDGES, nudgeById } from './nudges';
import type { PlannedReminder } from './reminders';

const CHANNEL_ID = 'nudges';

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

/** Replaces everything scheduled with the given plan. */
export async function scheduleReminders(plan: PlannedReminder[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannel();
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: { title: r.title, body: r.body, data: r.data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL_ID },
    });
  }
}

/** Cancels one scheduled reminder, e.g. today's streak nudge once the user has written. */
export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
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

function moduleTypeFrom(data: unknown): string | null {
  const t = (data as { openModuleType?: unknown } | null | undefined)?.openModuleType;
  return typeof t === 'string' ? t : null;
}

/**
 * Calls `onNudge` when a check-in notification arrives while the app is open, or is tapped
 * (including the tap that launched the app). Notifications that point at a module (an unlock)
 * call `onOpenModule` when tapped. Returns a cleanup function.
 */
export function listenForNudges(onNudge: (id: string) => void, onOpenModule: (type: string) => void): () => void {
  const received = Notifications.addNotificationReceivedListener((n) => {
    const id = nudgeIdFrom(n.request.content.data);
    if (id) onNudge(id);
  });
  const handleTap = (data: unknown) => {
    const type = moduleTypeFrom(data);
    if (type) onOpenModule(type);
    else {
      const id = nudgeIdFrom(data);
      if (id) onNudge(id);
    }
  };
  const tapped = Notifications.addNotificationResponseReceivedListener((r) => handleTap(r.notification.request.content.data));
  const launch = Notifications.getLastNotificationResponse();
  if (launch) handleTap(launch.notification.request.content.data);
  return () => {
    received.remove();
    tapped.remove();
  };
}
