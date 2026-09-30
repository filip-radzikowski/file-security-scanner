import { useMemo } from 'react';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { CardFrame, cardStyles, cardTextScale } from '../../components/CardFrame';
import { useOmaltStore } from '../../store/useOmaltStore';
import type { CardProps } from '../types';
import { STEPS_GOAL, deriveSteps, weeklySteps } from './schema';

export function StepsCard({ module }: CardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const week = useMemo(() => weeklySteps(deriveSteps(items, entries)), [items, entries]);
  const today = week.today ?? 0;
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {week.today === null ? 'Nothing today' : `${today.toLocaleString()} steps`}
      </AppText>
      <View style={cardStyles.track}>
        <View style={[cardStyles.fill, { width: `${Math.min(100, Math.round((today / STEPS_GOAL) * 100))}%` }]} />
      </View>
    </CardFrame>
  );
}
