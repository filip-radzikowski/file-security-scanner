import { AppText } from '../../components/AppText';
import { CardFrame, cardTextScale } from '../../components/CardFrame';
import type { CardProps } from '../types';

export function GenericCard({ module }: CardProps) {
  return (
    <CardFrame title={module.title}>
      <AppText variant="small" tone="soft" numberOfLines={2} maxFontSizeMultiplier={cardTextScale}>
        Coming soon
      </AppText>
    </CardFrame>
  );
}
