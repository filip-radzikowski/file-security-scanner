import { format } from 'date-fns';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { DayBars } from '../../components/DayBars';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { SyncNote } from '../../components/SyncNote';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, fonts, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import { lastSevenDays } from '../daily';
import type { DashboardProps } from '../types';
import { PulsingHeart } from './PulsingHeart';
import { bpmZone, heartSentence } from './schema';
import { useHeart } from './useHeart';

export function HeartDashboard(_props: DashboardProps) {
  const heart = useHeart();
  const source = useOmaltStore((s) => s.healthSource);
  const health = useOmaltStore((s) => s.healthDaily);
  const addEntry = useOmaltStore((s) => s.addEntry);
  const now = useNow(60000);
  const [draft, setDraft] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const resting = useMemo(() => {
    const slots = lastSevenDays([], new Date(now));
    return slots.map((s) => ({ key: s.key, label: s.label, value: health[s.key]?.restingHr ?? null, isToday: s.isToday }));
  }, [health, now]);
  const anyResting = resting.some((r) => r.value !== null);

  const bpm = parseInt(draft.replace(/[^0-9]/g, ''), 10);
  const valid = Number.isFinite(bpm) && bpm >= 30 && bpm <= 220;
  const submit = async () => {
    if (!valid) return;
    await addEntry(heartSentence(bpm));
    setDraft('');
  };

  return (
    <Screen>
      <Panel>
        <SyncNote metric="heart" />
        <View style={styles.live} accessible accessibilityLabel={heart ? `Heart rate ${heart.bpm} beats per minute` : 'No heart rate yet'}>
          <PulsingHeart bpm={heart?.bpm ?? null} size={84} showNumber />
          <View style={styles.liveText}>
            <AppText variant="display" accessibilityRole="header">
              {heart ? `${heart.bpm}` : '–'}
              <AppText variant="heading" tone="soft">
                {' '}
                bpm
              </AppText>
            </AppText>
            <AppText variant="body" tone="soft">
              {heart ? `${bpmZone(heart.bpm)} · ${format(heart.at, 'HH:mm')}` : 'Nothing to show yet'}
            </AppText>
          </View>
        </View>
        {reduceMotion ? (
          <AppText variant="small" tone="soft">
            The pulse is paused because Reduce Motion is on for your phone.
          </AppText>
        ) : null}
        {!source ? (
          <PillButton
            label="Connect Apple Health"
            kind="secondary"
            onPress={() => router.push('/health')}
            style={styles.connect}
          />
        ) : null}
      </Panel>

      {anyResting ? (
        <Panel>
          <AppText variant="label" tone="soft">
            RESTING HEART RATE
          </AppText>
          <DayBars
            days={resting}
            max={Math.max(80, ...resting.map((r) => r.value ?? 0))}
            color={colors.sage}
            accessibilityLabel={`Resting heart rate this week. ${resting
              .map((r) => `${r.label}: ${r.value === null ? 'none' : r.value}`)
              .join(', ')}`}
          />
        </Panel>
      ) : null}

      <Panel>
        <AppText variant="label" tone="soft">
          ADD A READING
        </AppText>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="e.g. 72"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Heart rate in beats per minute"
            style={styles.input}
            selectionColor={colors.sage}
            maxLength={3}
          />
          <PillButton label="Add" onPress={submit} disabled={!valid} accessibilityLabel="Add heart rate" />
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  live: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  liveText: { flex: 1, gap: 2 },
  connect: { alignSelf: 'flex-start' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
    flex: 1,
    minHeight: hitTarget,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
});
