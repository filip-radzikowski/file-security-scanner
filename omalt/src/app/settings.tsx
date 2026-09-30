import { Alert, Switch, View, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { Panel } from '../components/Panel';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, spacing } from '../theme';

export default function Settings() {
  const listView = useOmaltStore((s) => s.listView);
  const setListView = useOmaltStore((s) => s.setListView);
  const resetAll = useOmaltStore((s) => s.resetAll);

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
        <AppText variant="heading">Your data</AppText>
        <AppText variant="small" tone="soft">
          Everything is stored locally on this device. Nothing is sent anywhere.
        </AppText>
        <PillButton label="Erase all data" kind="ghost" onPress={confirmReset} />
      </Panel>

      <AppText variant="small" tone="soft" style={styles.footer}>
        Omalt {'·'} Start blank. Become yours.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  switchText: { flex: 1, gap: spacing.xs },
  footer: { textAlign: 'center' },
});
