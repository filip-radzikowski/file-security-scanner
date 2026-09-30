import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { DayBars } from '../../components/DayBars';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { SyncNote } from '../../components/SyncNote';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import { FeelingSlider } from '../mood/FeelingSlider';
import type { DashboardProps } from '../types';
import {
  SLEEP_TARGET_HOURS,
  deriveSleep,
  formatHours,
  restedWord,
  sleepSentence,
  weeklySleep,
} from './schema';

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
  const health = useOmaltStore((s) => s.healthDaily);
  const addEntry = useOmaltStore((s) => s.addEntry);
  const now = useNow(60000);

  const week = useMemo(() => weeklySleep(deriveSleep(items, entries), new Date(now), health), [items, entries, now, health]);

  // Start from last night's hours if we already know them (typed or synced).
  const [hours, setHours] = useState(() => week.lastNight ?? 7);
  const rested = useRef(week.rested[week.rested.length - 1] ?? 60);
  const [restedValue, setRestedValue] = useState(Math.round(rested.current));
  const [logged, setLogged] = useState<{ hours: number; rested: number } | null>(null);

  const onRested = useCallback((v: number) => {
    rested.current = v;
    setRestedValue(v);
    setLogged(null);
  }, []);

  const log = async () => {
    const payload = { hours, rested: rested.current };
    await addEntry(sleepSentence(payload.hours, payload.rested));
    setLogged(payload);
  };

  const hourBars = week.slots.map((s, i) => ({ key: s.key, label: s.label, value: week.hours[i], isToday: s.isToday }));
  const restedBars = week.slots.map((s, i) => ({ key: s.key, label: s.label, value: week.rested[i], isToday: s.isToday }));
  const anyRested = week.rested.some((r) => r !== null);

  return (
    <Screen>
      <Panel>
        <SyncNote metric="sleep" />
        <AppText variant="label" tone="sage">
          HOW MUCH DID YOU SLEEP?
        </AppText>
        <View style={styles.stepper}>
          <Step label="−" onPress={() => setHours((h) => Math.max(0, h - 0.5))} />
          <AppText variant="display" accessibilityLiveRegion="polite">
            {formatHours(hours)}
          </AppText>
          <Step label="+" onPress={() => setHours((h) => Math.min(14, h + 0.5))} />
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="sage">
          HOW RESTED DO YOU FEEL AFTER {formatHours(hours).toUpperCase()}?
        </AppText>
        <FeelingSlider
          initial={rested.current}
          onChange={onRested}
          wordFor={restedWord}
          suffix="%"
          label="How rested do you feel, from 0 to 100 percent"
          ends={['0% · Drained', '50%', 'Refreshed · 100%']}
        />
        <PillButton
          label={logged ? 'Logged' : `Log ${formatHours(hours)} · ${restedValue}% rested`}
          accessibilityLabel={
            logged
              ? `Logged ${formatHours(logged.hours)} and ${logged.rested} percent rested`
              : `Log ${formatHours(hours)} of sleep and ${restedValue} percent rested`
          }
          onPress={log}
          disabled={logged !== null}
          style={styles.log}
        />
        <AppText variant="small" tone="soft" accessibilityLiveRegion="polite">
          {logged
            ? `Saved: ${formatHours(logged.hours)}, ${logged.rested}% rested (${restedWord(logged.rested).toLowerCase()}).`
            : 'Set the hours above, drag to how you feel, then log it. It goes into your diary too.'}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          HOURS THIS WEEK
        </AppText>
        <AppText variant="heading">
          {week.average === null ? 'No sleep logged yet' : `${formatHours(Math.round(week.average * 10) / 10)} on average`}
        </AppText>
        <AppText variant="small" tone="soft">
          A good night is around {SLEEP_TARGET_HOURS} hours.
        </AppText>
        <DayBars
          days={hourBars}
          max={10}
          accessibilityLabel={`Sleep this week. ${hourBars
            .map((b) => `${b.label}: ${b.value === null ? 'none' : formatHours(b.value)}`)
            .join(', ')}`}
        />
      </Panel>

      {anyRested ? (
        <Panel>
          <AppText variant="label" tone="soft">
            HOW RESTED YOU FELT
          </AppText>
          <AppText variant="heading">
            {week.restedAverage === null ? '' : `${Math.round(week.restedAverage)}% on average`}
          </AppText>
          <DayBars
            days={restedBars}
            max={100}
            color={colors.sageDeep}
            accessibilityLabel={`How rested you felt this week. ${restedBars
              .map((b) => `${b.label}: ${b.value === null ? 'none' : `${Math.round(b.value)} percent`}`)
              .join(', ')}`}
          />
        </Panel>
      ) : null}
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
