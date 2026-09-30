import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { DayBars } from '../../components/DayBars';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, fonts, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { STEPS_GOAL, deriveSteps, stepsSentence, weeklySteps } from './schema';

export function StepsDashboard(_props: DashboardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const addEntry = useOmaltStore((s) => s.addEntry);
  const now = useNow(60000);
  const [draft, setDraft] = useState('');

  const week = useMemo(() => weeklySteps(deriveSteps(items, entries), new Date(now)), [items, entries, now]);
  const today = week.today ?? 0;
  const pct = Math.min(100, Math.round((today / STEPS_GOAL) * 100));
  const bars = week.slots.map((s, i) => ({ key: s.key, label: s.label, value: week.totals[i], isToday: s.isToday }));
  const max = Math.max(STEPS_GOAL, ...week.totals.map((t) => t ?? 0));

  const count = parseInt(draft.replace(/[^0-9]/g, ''), 10);
  const valid = Number.isFinite(count) && count > 0 && count < 200000;
  const submit = async () => {
    if (!valid) return;
    await addEntry(stepsSentence(count));
    setDraft('');
  };

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          TODAY
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {today.toLocaleString()} steps
        </AppText>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Progress to the daily step goal"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
        >
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <AppText variant="small" tone="soft">
          {today >= STEPS_GOAL
            ? `Goal of ${STEPS_GOAL.toLocaleString()} reached.`
            : `${(STEPS_GOAL - today).toLocaleString()} to go for a goal of ${STEPS_GOAL.toLocaleString()}.`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          ADD STEPS
        </AppText>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            keyboardType="number-pad"
            returnKeyType="done"
            placeholder="e.g. 4200"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="Number of steps"
            style={styles.input}
            selectionColor={colors.sage}
            maxLength={6}
          />
          <PillButton label="Add" onPress={submit} disabled={!valid} accessibilityLabel="Add steps" />
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          THIS WEEK
        </AppText>
        <AppText variant="heading">
          {week.average === null ? 'No steps logged yet' : `${week.average.toLocaleString()} a day on average`}
        </AppText>
        <DayBars
          days={bars}
          max={max}
          accessibilityLabel={`Steps this week. ${bars
            .map((b) => `${b.label}: ${b.value === null ? 'none' : b.value}`)
            .join(', ')}`}
        />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sandSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.sage },
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
