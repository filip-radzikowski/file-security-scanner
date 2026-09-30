import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { MOOD_LEVELS, moodLabel, todaysMood, weeklyAverage, weeklyMood } from './schema';

const CHART_HEIGHT = 140;

export function MoodDashboard(_props: DashboardProps) {
  const moods = useOmaltStore((s) => s.moods);
  const logMood = useOmaltStore((s) => s.logMood);

  const days = useMemo(() => weeklyMood(moods), [moods]);
  const average = weeklyAverage(days);
  const today = todaysMood(moods);

  const chartSummary = days
    .map((d) => `${d.label}: ${d.average === null ? 'no entry' : moodLabel(d.average)}`)
    .join(', ');

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          HOW ARE YOU TODAY
        </AppText>
        <View style={styles.buttons}>
          {MOOD_LEVELS.map((level) => {
            const selected = today === level.score;
            return (
              <Pressable
                key={level.score}
                onPress={() => logMood(level.score)}
                accessibilityRole="button"
                accessibilityLabel={`${level.label}, ${level.score} out of 5`}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.moodButton, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: colors.mood[level.score - 1] },
                    selected && styles.dotSelected,
                  ]}
                >
                  <AppText variant="bodyStrong" tone="onSage" allowFontScaling={false}>
                    {level.score}
                  </AppText>
                </View>
                <AppText variant="small" tone={selected ? 'ink' : 'soft'} numberOfLines={1}>
                  {level.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <AppText variant="small" tone="soft" accessibilityLiveRegion="polite">
          {today === null ? 'Tap one to log how today feels.' : `Today: ${moodLabel(today)}. Tap again to log another.`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          THIS WEEK
        </AppText>
        <View style={styles.averageRow}>
          <AppText variant="display" accessibilityRole="header">
            {average === null ? '–' : average.toFixed(1)}
          </AppText>
          <AppText variant="body" tone="soft">
            {average === null ? 'No entries yet' : `average · ${moodLabel(average)}`}
          </AppText>
        </View>
        <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={`Weekly mood. ${chartSummary}`}>
          {days.map((d) => {
            const h = d.average === null ? 6 : Math.max(10, (d.average / 5) * CHART_HEIGHT);
            return (
              <View key={d.date.getTime()} style={styles.barCol}>
                <View style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor:
                          d.average === null ? colors.sandSoft : colors.mood[Math.round(d.average) - 1],
                      },
                      d.isToday && styles.barToday,
                    ]}
                  />
                </View>
                <AppText variant="small" tone={d.isToday ? 'ink' : 'soft'} numberOfLines={1}>
                  {d.label}
                </AppText>
              </View>
            );
          })}
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  moodButton: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: hitTarget, borderRadius: radius.sm },
  pressed: { opacity: 0.7 },
  dot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  dotSelected: { borderWidth: 2.5, borderColor: colors.sageDeep },
  averageRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' },
  chart: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', marginTop: spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barSlot: { height: CHART_HEIGHT, justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: radius.sm - 4 },
  barToday: { borderWidth: 1.5, borderColor: colors.sageDeep },
});
