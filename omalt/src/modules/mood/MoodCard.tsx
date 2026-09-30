import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors } from '../../theme';
import type { CardProps } from '../types';
import { moodIndex, moodLabel, weeklyAverage, weeklyMood } from './schema';
import { useMemo } from 'react';

export function MoodCard({ module }: CardProps) {
  const moods = useOmaltStore((s) => s.moods);
  const days = useMemo(() => weeklyMood(moods), [moods]);
  const avg = weeklyAverage(days);
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {avg === null ? 'No mood logged yet' : `This week: ${moodLabel(avg)}`}
      </AppText>
      <View style={styles.bars}>
        {days.map((d) => (
          <View
            key={d.label + d.date.getTime()}
            style={[
              styles.bar,
              {
                height: d.average === null ? 4 : 4 + (d.average / 100) * 20,
                backgroundColor: d.average === null ? colors.sandSoft : colors.mood[moodIndex(d.average)],
              },
            ]}
          />
        ))}
      </View>
    </CardFrame>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 24 },
  bar: { flex: 1, borderRadius: 3 },
});
