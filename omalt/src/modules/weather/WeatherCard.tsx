import { useMemo } from 'react';
import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import { useOmaltStore } from '../../store/useOmaltStore';
import { lastSevenDays } from '../daily';
import type { CardProps } from '../types';
import { conditionLabel, deriveWeather } from './schema';

export function WeatherCard({ module }: CardProps) {
  const items = useOmaltStore((s) => s.items);
  const entries = useOmaltStore((s) => s.entries);
  const today = useMemo(() => {
    const slot = lastSevenDays(deriveWeather(items, entries)).pop();
    const last = slot?.values[slot.values.length - 1];
    return last ? conditionLabel(last.data.condition) : null;
  }, [items, entries]);
  return (
    <CardFrame title={module.title}>
      <AppText variant="bodyStrong" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {today ?? 'Nothing yet'}
      </AppText>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {today ? 'Today' : "Tap to log today's weather"}
      </AppText>
    </CardFrame>
  );
}
