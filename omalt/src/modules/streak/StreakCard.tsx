import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors } from '../../theme';
import type { CardProps } from '../types';
import { streakInfo } from './schema';

export function StreakCard({ module }: CardProps) {
  const entries = useOmaltStore((s) => s.entries);
  const now = useNow(60000);
  const info = useMemo(() => streakInfo(entries, now), [entries, now]);
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {info.current} day{info.current === 1 ? '' : 's'} in a row
      </AppText>
      <View style={styles.dots}>
        {info.days.slice(-7).map((d) => (
          <View key={d.date.getTime()} style={[styles.dot, d.active && styles.dotOn]} />
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
