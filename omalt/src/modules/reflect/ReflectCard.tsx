import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors } from '../../theme';
import type { CardProps } from '../types';
import { weekSummary } from './schema';

export function ReflectCard({ module }: CardProps) {
  const entries = useOmaltStore((s) => s.entries);
  const tasks = useOmaltStore((s) => s.tasks);
  const now = useNow(60000);
  const week = useMemo(() => weekSummary(entries, tasks, now), [entries, tasks, now]);
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {week.entryCount} {week.entryCount === 1 ? 'entry' : 'entries'} this week
      </AppText>
      <View style={styles.dots}>
        {week.days.map((d) => (
          <View key={d.date.getTime()} style={[styles.dot, d.hasEntry && styles.dotOn]} />
        ))}
      </View>
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.sandSoft },
  dotOn: { backgroundColor: colors.sage },
});
