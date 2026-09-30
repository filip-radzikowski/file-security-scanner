import { Alert, Switch, View, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { Panel } from '../components/Panel';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { useOmaltStore } from '../store/useOmaltStore';
import { BUILD_ID } from '../lib/build';
import { colors, spacing } from '../theme';

export default function Settings() {
  const listView = useOmaltStore((s) => s.listView);
  const setListView = useOmaltStore((s) => s.setListView);
  const resetAll = useOmaltStore((s) => s.resetAll);
  const clockOffsetMs = useOmaltStore((s) => s.clockOffsetMs);
  const skipAhead = useOmaltStore((s) => s.skipAhead);
  const resetClock = useOmaltStore((s) => s.resetClock);
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
