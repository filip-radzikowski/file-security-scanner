import { format } from 'date-fns';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import { lastSevenDays } from '../daily';
import type { DashboardProps } from '../types';
import { WEATHER_CONDITIONS, conditionLabel, deriveWeather, weatherSentence } from './schema';

export function WeatherDashboard(_props: DashboardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const addEntry = useOmaltStore((s) => s.addEntry);
  const now = useNow(60000);

  const points = useMemo(() => deriveWeather(items, entries), [items, entries]);
  const week = useMemo(() => lastSevenDays(points, new Date(now)), [points, now]);
  const todayLatest = week[week.length - 1]?.values.slice(-1)[0]?.data.condition;
  const recent = useMemo(() => [...points].reverse().slice(0, 6), [points]);

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          HOW'S THE WEATHER?
        </AppText>
        <AppText variant="small" tone="soft">
          Tap one and it goes into your diary.
        </AppText>
        <View style={styles.chips}>
          {WEATHER_CONDITIONS.map((c) => {
            const selected = todayLatest === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => addEntry(weatherSentence(c.id))}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
              >
                <AppText variant="button" tone={selected ? 'onSage' : 'ink'}>
                  {c.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          THIS WEEK
        </AppText>
        <View style={styles.week}>
          {week.map((d) => {
            const last = d.values[d.values.length - 1]?.data.condition;
            return (
              <View
                key={d.key}
                style={styles.day}
                accessible
                accessibilityLabel={`${d.label}: ${last ? conditionLabel(last) : 'not logged'}`}
              >
                <View style={[styles.dot, last ? styles.dotOn : null, d.isToday && styles.dotToday]}>
                  <AppText variant="small" tone={last ? 'onSage' : 'soft'} allowFontScaling={false}>
                    {last ? conditionLabel(last).slice(0, 2) : '–'}
                  </AppText>
                </View>
                <AppText variant="small" tone={d.isToday ? 'ink' : 'soft'}>
                  {d.label}
                </AppText>
              </View>
            );
          })}
        </View>
      </Panel>

      {recent.length > 0 ? (
        <Panel>
          <AppText variant="label" tone="soft">
            RECENT
          </AppText>
          {recent.map((p) => (
            <View key={p.entryId} style={styles.row}>
              <AppText variant="body">{conditionLabel(p.data.condition)}</AppText>
              <AppText variant="small" tone="soft">
                {format(p.createdAt, 'EEE d MMM · HH:mm')}
              </AppText>
            </View>
          ))}
        </Panel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
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
  pressed: { opacity: 0.75 },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  day: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sandSoft,
  },
  dotOn: { backgroundColor: colors.sage },
  dotToday: { borderWidth: 2, borderColor: colors.sageDeep },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.md },
});
