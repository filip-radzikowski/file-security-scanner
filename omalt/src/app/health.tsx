import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Panel } from '../components/Panel';
import { PillButton } from '../components/PillButton';
import { Screen } from '../components/Screen';
import { Availability, SOURCE_LABELS, getHealthService } from '../health';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../theme';

const DEVICES = [
  { id: 'watch', label: 'Apple Watch' },
  { id: 'oura', label: 'Oura ring' },
  { id: 'whoop', label: 'Whoop' },
  { id: 'garmin', label: 'Garmin' },
  { id: 'fitbit', label: 'Fitbit' },
  { id: 'other', label: 'Something else' },
];

export default function HealthScreen() {
  const source = useOmaltStore((s) => s.healthSource);
  const syncedAt = useOmaltStore((s) => s.healthSyncedAt);
  const devices = useOmaltStore((s) => s.devices);
  const connectHealth = useOmaltStore((s) => s.connectHealth);
  const disconnectHealth = useOmaltStore((s) => s.disconnectHealth);
  const syncHealth = useOmaltStore((s) => s.syncHealth);
  const toggleDevice = useOmaltStore((s) => s.toggleDevice);
  const [apple, setApple] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getHealthService('apple').availability().then(setApple).catch(() => setApple({ available: false, reason: 'Could not check Apple Health.' }));
  }, []);

  const connect = async () => {
    setBusy(true);
    const r = await connectHealth('apple');
    setBusy(false);
    if (!r.ok) Alert.alert('Could not connect', r.message ?? 'Something went wrong.');
  };

  const toggleDemo = async (on: boolean) => {
    if (on) await connectHealth('demo');
    else await disconnectHealth();
  };

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          APPLE HEALTH
        </AppText>
        <AppText variant="body">
          Steps, sleep and heart rate appear on your canvas automatically. Omalt only reads them; nothing leaves your phone.
        </AppText>
        {source === 'apple' ? (
          <>
            <AppText variant="small" tone="sage">
              Connected{syncedAt ? ` \u00B7 synced ${format(syncedAt, 'HH:mm')}` : ''}
            </AppText>
            <View style={styles.buttons}>
              <PillButton label="Sync now" kind="secondary" onPress={() => syncHealth()} />
              <PillButton label="Disconnect" kind="ghost" onPress={() => disconnectHealth()} />
            </View>
          </>
        ) : apple?.available ? (
          <PillButton label={busy ? 'Connecting…' : 'Connect Apple Health'} onPress={connect} disabled={busy} style={styles.start} />
        ) : (
          <>
            <AppText variant="small" tone="soft">
              {apple?.reason ?? 'Checking…'}
            </AppText>
            <AppText variant="small" tone="soft">
              To use it, build Omalt as a development build on your iPhone (see the README, "Apple Health"), or try the
              demo data below.
            </AppText>
          </>
        )}
      </Panel>

      <Panel>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="heading">Demo data</AppText>
            <AppText variant="small" tone="soft">
              Simulated steps, sleep and a live heart rate, so you can see how synced tiles look and pulse. Marked as
              simulated wherever it appears.
            </AppText>
          </View>
          <Switch
            value={source === 'demo'}
            onValueChange={toggleDemo}
            disabled={source === 'apple'}
            trackColor={{ false: colors.sand, true: colors.sage }}
            thumbColor={colors.ivory}
            accessibilityLabel="Demo data"
          />
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          DO YOU HAVE A WATCH OR SLEEP DEVICE?
        </AppText>
        <View style={styles.chips}>
          {DEVICES.map((d) => {
            const on = devices.includes(d.id);
            return (
              <Pressable
                key={d.id}
                onPress={() => toggleDevice(d.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={d.label}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.75 }]}
              >
                <AppText variant="button" tone={on ? 'onSage' : 'ink'}>
                  {d.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="small" tone="soft">
          Watches and rings send their data to Apple Health through their own apps (for Oura, Whoop, Garmin or Fitbit, turn
          on Apple Health sharing in that app). Once that is on, Omalt reads it from Apple Health, including sleep from
          your device and a live heart rate. Omalt does not connect to device makers directly.
        </AppText>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  start: { alignSelf: 'flex-start' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  switchText: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
});
