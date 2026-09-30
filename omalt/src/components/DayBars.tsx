import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

export interface DayBar {
  key: string;
  label: string;
  /** null = nothing logged */
  value: number | null;
  isToday: boolean;
}

interface Props {
  days: DayBar[];
  max: number;
  height?: number;
  color?: string;
  accessibilityLabel: string;
}

/** Seven-day bar chart used by the tracker dashboards. */
export function DayBars({ days, max, height = 120, color = colors.sage, accessibilityLabel }: Props) {
  return (
    <View style={styles.chart} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      {days.map((d) => {
        const h = d.value === null ? 6 : Math.max(8, Math.min(1, d.value / max) * height);
        return (
          <View key={d.key} style={styles.col}>
            <View style={[styles.slot, { height }]}>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: d.value === null ? colors.sandSoft : color },
                  d.isToday && styles.today,
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
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', marginTop: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: spacing.xs },
  slot: { justifyContent: 'flex-end', width: '100%' },
  bar: { width: '100%', borderRadius: radius.sm - 4 },
  today: { borderWidth: 1.5, borderColor: colors.sageDeep },
});
