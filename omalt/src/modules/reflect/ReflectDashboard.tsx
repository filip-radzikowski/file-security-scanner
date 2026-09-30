import { format } from 'date-fns';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, spacing } from '../../theme';
import { moodLabel } from '../mood/schema';
import type { DashboardProps } from '../types';
import { weekSummary } from './schema';

export function ReflectDashboard(_props: DashboardProps) {
  const entries = useOmaltStore((s) => s.entries);
  const tasks = useOmaltStore((s) => s.tasks);
  const now = useNow(60000);
  const week = useMemo(() => weekSummary(entries, tasks, now), [entries, tasks, now]);

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          THIS WEEK
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {week.entryCount} {week.entryCount === 1 ? 'entry' : 'entries'}
        </AppText>
        <AppText variant="small" tone="soft">
          You showed up on {week.activeDays} of the last 7 days.
        </AppText>
        <View style={styles.days}>
          {week.days.map((d) => (
            <View
              key={d.date.getTime()}
              style={styles.day}
              accessible
              accessibilityLabel={`${d.label}: ${d.hasEntry ? 'wrote' : 'no entry'}`}
            >
              <View style={[styles.dot, d.hasEntry && styles.dotOn, d.isToday && styles.dotToday]} />
              <AppText variant="small" tone={d.isToday ? 'ink' : 'soft'}>
                {d.label}
              </AppText>
            </View>
          ))}
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          FEELING
        </AppText>
        <AppText variant="heading">
          {week.moodAverage === null
            ? 'No mood written about this week'
            : `Mostly ${moodLabel(week.moodAverage).toLowerCase()} (${Math.round(week.moodAverage)} out of 100)`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          GOT DONE
        </AppText>
        <AppText variant="heading">
          {week.tasksDone} {week.tasksDone === 1 ? 'task' : 'tasks'} ticked off
        </AppText>
      </Panel>

      {week.latest.length > 0 ? (
        <Panel>
          <AppText variant="label" tone="soft">
            LATEST WRITING
          </AppText>
          {week.latest.map((e) => (
            <View key={e.id}>
              <AppText variant="body">{e.text}</AppText>
              <AppText variant="small" tone="soft">
                {format(e.createdAt, 'EEE d MMM · HH:mm')}
              </AppText>
            </View>
          ))}
        </Panel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  day: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sandSoft },
  dotOn: { backgroundColor: colors.sage },
  dotToday: { borderWidth: 2, borderColor: colors.sageDeep },
});
