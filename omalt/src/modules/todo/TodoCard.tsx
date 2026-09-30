import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { CardFrame, cardStyles, cardTextScale } from '../../components/CardFrame';
import { useOmaltStore } from '../../store/useOmaltStore';
import { taskStats } from './schema';
import type { CardProps } from '../types';

export function TodoCard({ module }: CardProps) {
  const tasks = useOmaltStore((s) => s.tasks);
  const stats = taskStats(tasks);
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
        {stats.total === 0 ? 'Nothing yet' : `${stats.open} open · ${stats.done} done`}
      </AppText>
      <View style={cardStyles.track}>
        <View style={[cardStyles.fill, { width: `${Math.round(stats.progress * 100)}%` }]} />
      </View>
    </CardFrame>
  );
}
