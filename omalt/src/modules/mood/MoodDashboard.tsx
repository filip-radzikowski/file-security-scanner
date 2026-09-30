import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { PillButton } from '../../components/PillButton';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { FeelingSlider } from './FeelingSlider';
import { MOOD_LEVELS, moodIndex, moodLabel, todaysMood, weeklyAverage, weeklyMood } from './schema';

const CHART_HEIGHT = 140;

export function MoodDashboard(_props: DashboardProps) {
  const moods = useOmaltStore((s) => s.moods);
  const logMood = useOmaltStore((s) => s.logMood);

  const days = useMemo(() => weeklyMood(moods), [moods]);
  const average = weeklyAverage(days);
  const today = todaysMood(moods);

  // The slider keeps its own draft; nothing is saved until "Log it".
  const draft = useRef(today ?? 50);
  const [draftValue, setDraftValue] = useState(Math.round(today ?? 50));
  const [justLogged, setJustLogged] = useState<number | null>(null);
  const onSlide = useCallback((v: number) => {
    draft.current = v;
    setDraftValue(v);
    setJustLogged(null);
  }, []);
  const logDraft = async () => {
    const v = draft.current;
    await logMood(v);
    setJustLogged(v);
  };

  const chartSummary = days
    .map((d) => `${d.label}: ${d.average === null ? 'no entry' : `${moodLabel(d.average)}, ${Math.round(d.average)}`}`)
    .join(', ');

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          HOW DO YOU FEEL RIGHT NOW
        </AppText>
        <FeelingSlider initial={today ?? 50} onChange={onSlide} />
        <PillButton
          label={justLogged === null ? `Log ${draftValue}` : `Logged ${justLogged}`}
          accessibilityLabel={justLogged === null ? `Log ${draftValue} out of 100` : `Logged ${justLogged} out of 100`}
          onPress={logDraft}
          disabled={justLogged !== null}
          style={styles.logButton}
        />
        <AppText variant="small" tone="soft" accessibilityLiveRegion="polite">
          {justLogged === null
            ? 'Drag the dot or tap the bar, then log it.'
            : `Saved: ${moodLabel(justLogged)}, ${justLogged} out of 100.`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          OR PICK A WORD
        </AppText>
        <View style={styles.buttons}>
          {MOOD_LEVELS.map((level) => {
            const selected = today !== null && moodIndex(today) === level.score - 1;
            return (
              <Pressable
                key={level.score}
                onPress={() => logMood(level.value)}
                accessibilityRole="button"
                accessibilityLabel={`${level.label}, about ${level.value} out of 100`}
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
                    {level.value}
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
          {today === null ? 'Tap one to log how today feels.' : `Today: ${moodLabel(today)} (${Math.round(today)}). Tap again to log another.`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          THIS WEEK
        </AppText>
        <View style={styles.averageRow}>
          <AppText variant="display" accessibilityRole="header">
            {average === null ? '–' : Math.round(average)}
          </AppText>
          <AppText variant="body" tone="soft">
            {average === null ? 'No entries yet' : `average out of 100 · ${moodLabel(average)}`}
          </AppText>
        </View>
        <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={`Weekly mood. ${chartSummary}`}>
          {days.map((d) => {
            const h = d.average === null ? 6 : Math.max(10, (d.average / 100) * CHART_HEIGHT);
            return (
              <View key={d.date.getTime()} style={styles.barCol}>
                <View style={styles.barSlot}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor:
                          d.average === null ? colors.sandSoft : colors.mood[moodIndex(d.average)],
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
  logButton: { alignSelf: 'flex-start' },
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
