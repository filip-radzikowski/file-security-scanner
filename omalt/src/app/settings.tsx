import { router } from 'expo-router';
import { Alert, Pressable, Switch, View, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { Panel } from '../components/Panel';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { useOmaltStore } from '../store/useOmaltStore';
import { BUILD_ID } from '../lib/build';
import { scheduleTestNudge } from '../nudges/notifications';
import { colors, spacing } from '../theme';

export default function Settings() {
  const listView = useOmaltStore((s) => s.listView);
  const setListView = useOmaltStore((s) => s.setListView);
  const resetAll = useOmaltStore((s) => s.resetAll);
  const clockOffsetMs = useOmaltStore((s) => s.clockOffsetMs);
  const skipAhead = useOmaltStore((s) => s.skipAhead);
  const resetClock = useOmaltStore((s) => s.resetClock);
  const smoothMotion = useOmaltStore((s) => s.smoothMotion);
  const setSmoothMotion = useOmaltStore((s) => s.setSmoothMotion);
  const nudgesEnabled = useOmaltStore((s) => s.nudgesEnabled);
  const setNudgesEnabled = useOmaltStore((s) => s.setNudgesEnabled);
  const showNudge = useOmaltStore((s) => s.showNudge);
  const daysAhead = Math.round(clockOffsetMs / (24 * 60 * 60 * 1000));

  const confirmReset = () =>
    Alert.alert('Erase everything?', 'This deletes all entries, modules and settings on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => resetAll() },
    ]);

  return (
    <Screen>
      <Panel>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="heading">Plain list view</AppText>
            <AppText variant="small" tone="soft">
              Show your modules as a simple list instead of the pannable canvas. Recommended with a screen reader.
            </AppText>
          </View>
          <Switch
            value={listView}
            onValueChange={setListView}
            trackColor={{ false: colors.sand, true: colors.sage }}
            thumbColor={colors.ivory}
            accessibilityLabel="Plain list view"
          />
        </View>
      </Panel>

      <Pressable
        onPress={() => router.push('/health')}
        accessibilityRole="button"
        accessibilityLabel="Health and devices"
        accessibilityHint="Connect Apple Health, a watch or a sleep device"
      >
        <Panel>
          <AppText variant="heading">Health & devices {'\u203A'}</AppText>
          <AppText variant="small" tone="soft">
            Bring in steps, sleep and heart rate from Apple Health, a watch or a ring.
          </AppText>
        </Panel>
      </Pressable>

      <Panel>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="heading">Smooth canvas motion</AppText>
            <AppText variant="small" tone="soft">
              Keeps the canvas gliding after a swipe and flying back on Recentre. If your phone has Reduce
              Motion turned on, these would otherwise snap instantly. Turn this off to follow your phone's
              setting exactly.
            </AppText>
          </View>
          <Switch
            value={smoothMotion}
            onValueChange={setSmoothMotion}
            trackColor={{ false: colors.sand, true: colors.sage }}
            thumbColor={colors.ivory}
            accessibilityLabel="Smooth canvas motion"
          />
        </View>
      </Panel>

      <Panel>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="heading">Gentle nudges</AppText>
            <AppText variant="small" tone="soft">
              About one quick question a day, like "How's the weather?" or "Did you go to the gym?", at a
              random time. Tap one to answer and it goes into your diary.
            </AppText>
          </View>
          <Switch
            value={nudgesEnabled}
            onValueChange={async (on) => {
              const ok = await setNudgesEnabled(on);
              if (!ok) {
                Alert.alert(
                  'Notifications are off',
                  'Allow notifications for this app in your phone settings to get nudges.',
                );
              }
            }}
            trackColor={{ false: colors.sand, true: colors.sage }}
            thumbColor={colors.ivory}
            accessibilityLabel="Gentle nudges"
          />
        </View>
        <View style={styles.buttons}>
          <PillButton
            label="Show a check-in now"
            kind="secondary"
            onPress={() => {
              showNudge(['weather', 'gym', 'sleep', 'steps', 'plan', 'grateful', 'energy', 'water'][Math.floor(Math.random() * 8)]);
              router.back();
            }}
          />
          {nudgesEnabled ? (
            <PillButton
              label="Send a test in 5s"
              kind="ghost"
              onPress={async () => {
                try {
                  await scheduleTestNudge(5);
                  Alert.alert('Scheduled', 'Leave the app now. A nudge will arrive in a few seconds.');
                } catch {
                  Alert.alert('Could not schedule', 'Notifications may be unavailable here.');
                }
              }}
            />
          ) : null}
        </View>
      </Panel>

      <Panel>
        <AppText variant="heading">Preview unlocks</AppText>
        <AppText variant="small" tone="soft">
          Some modules unlock over days. Skip the clock forward to see them open. Entries you write
          afterwards are dated to match.
        </AppText>
        <AppText variant="small" tone={daysAhead === 0 ? 'soft' : 'sage'}>
          {daysAhead === 0 ? 'Clock is running normally.' : `Clock is ${daysAhead} day${daysAhead === 1 ? '' : 's'} ahead.`}
        </AppText>
        <View style={styles.buttons}>
          <PillButton label="Skip ahead 1 day" kind="secondary" onPress={() => skipAhead(1)} />
          {daysAhead !== 0 ? <PillButton label="Reset clock" kind="ghost" onPress={() => resetClock()} /> : null}
        </View>
      </Panel>

      <Panel>
        <AppText variant="heading">Your data</AppText>
        <AppText variant="small" tone="soft">
          Everything is stored locally on this device. Nothing is sent anywhere.
        </AppText>
        <PillButton label="Erase all data" kind="ghost" onPress={confirmReset} />
      </Panel>

      <AppText variant="small" tone="soft" style={styles.footer}>
        Omalt {'·'} Start blank. Become yours. {'·'} Build {BUILD_ID}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  switchText: { flex: 1, gap: spacing.xs },
  footer: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
