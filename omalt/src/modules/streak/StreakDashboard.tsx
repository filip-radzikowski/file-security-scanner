import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { streakInfo } from './schema';

export function StreakDashboard(_props: DashboardProps) {
  const entries = useOmaltStore((s) => s.entries);
  const now = useNow(60000);
  const info = useMemo(() => streakInfo(entries, now), [entries, now]);
  const weeks = [0, 1, 2, 3].map((w) => info.days.slice(w * 7, w * 7 + 7));

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          CURRENT STREAK
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {info.current} day{info.current === 1 ? '' : 's'}
        </AppText>
        <AppText variant="small" tone="soft">
          Best so far: {info.best} day{info.best === 1 ? '' : 's'}.{' '}
          {info.current === 0 ? 'Write today to start a new run.' : 'Write today to keep it going.'}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          LAST 4 WEEKS
        </AppText>
        <View accessible accessibilityLabel={`You wrote on ${info.days.filter((d) => d.active).length} of the last 28 days`}>
          {weeks.map((week, i) => (
            <View key={i} style={styles.row}>
              {week.map((d) => (
                <View key={d.date.getTime()} style={[styles.dot, d.active && styles.dotOn, d.isToday && styles.dotToday]} />
              ))}
            </View>
          ))}
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sandSoft },
  dotOn: { backgroundColor: colors.sage },
  dotToday: { borderWidth: 2, borderColor: colors.sageDeep },
});
