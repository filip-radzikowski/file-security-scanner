import { useMemo } from 'react';
import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import { useOmaltStore } from '../../store/useOmaltStore';
import type { CardProps } from '../types';
import { deriveSleep, formatHours, weeklySleep } from './schema';

export function SleepCard({ module }: CardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const week = useMemo(() => weeklySleep(deriveSleep(items, entries)), [items, entries]);
  return (
    <CardFrame title={module.title}>
      <AppText variant="bodyStrong" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {week.lastNight === null ? 'Nothing yet' : formatHours(week.lastNight)}
      </AppText>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {week.average === null ? 'Log last night' : `Avg ${formatHours(Math.round(week.average * 10) / 10)}`}
      </AppText>
    </CardFrame>
  );
}
