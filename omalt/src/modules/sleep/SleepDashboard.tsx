import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { DayBars } from '../../components/DayBars';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { SyncNote } from '../../components/SyncNote';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { SLEEP_TARGET_HOURS, deriveSleep, formatHours, sleepSentence, weeklySleep } from './schema';

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'More sleep, half an hour' : 'Less sleep, half an hour'}
      style={({ pressed }) => [styles.step, pressed && { opacity: 0.7 }]}
    >
      <AppText variant="heading" allowFontScaling={false}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SleepDashboard(_props: DashboardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const addEntry = useOmaltStore((s) => s.addEntry);
  const health = useOmaltStore((s) => s.healthDaily);
  const now = useNow(60000);
  const [hours, setHours] = useState(7);

  const week = useMemo(() => weeklySleep(deriveSleep(items, entries), new Date(now), health), [items, entries, now, health]);
  const bars = week.slots.map((s, i) => ({ key: s.key, label: s.label, value: week.hours[i], isToday: s.isToday }));

  return (
    <Screen>
      <Panel>
        <SyncNote metric="sleep" />
        <AppText variant="label" tone="sage">
          HOW DID YOU SLEEP?
        </AppText>
        <View style={styles.stepper}>
          <Step label="−" onPress={() => setHours((h) => Math.max(0, h - 0.5))} />
          <AppText variant="display" accessibilityLiveRegion="polite">
            {formatHours(hours)}
          </AppText>
          <Step label="+" onPress={() => setHours((h) => Math.min(14, h + 0.5))} />
        </View>
        <PillButton
          label="Log last night"
          onPress={() => addEntry(sleepSentence(hours))}
          style={styles.log}
        />
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          THIS WEEK
        </AppText>
        <AppText variant="heading">
          {week.average === null ? 'No sleep logged yet' : `${formatHours(Math.round(week.average * 10) / 10)} on average`}
        </AppText>
        <AppText variant="small" tone="soft">
          A good night is around {SLEEP_TARGET_HOURS} hours.
        </AppText>
        <DayBars
          days={bars}
          max={10}
          accessibilityLabel={`Sleep this week. ${bars
            .map((b) => `${b.label}: ${b.value === null ? 'none' : formatHours(b.value)}`)
            .join(', ')}`}
        />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: {
    width: hitTarget + 8,
    height: hitTarget + 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  log: { alignSelf: 'flex-start' },
});
