import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { cardTextScale } from '../../components/CardFrame';
import { fixedSurfaceFontScale, spacing } from '../../theme';
import type { CardProps } from '../types';
import { PulsingHeart } from './PulsingHeart';
import { useHeart } from './useHeart';

/** The whole tile beats with the heart: the dot pulses at the current bpm. */
export function HeartCard({ module }: CardProps) {
  const heart = useHeart();
  return (
    <View style={styles.frame}>
      <View style={styles.text}>
        <AppText variant="heading" numberOfLines={1} maxFontSizeMultiplier={fixedSurfaceFontScale}>
          {module.title}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
          {heart ? `${heart.bpm} bpm` : 'No reading'}
        </AppText>
        <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
          {heart ? (heart.source === 'manual' ? 'You logged' : 'Live') : 'Tap to set up'}
        </AppText>
      </View>
      <PulsingHeart bpm={heart?.bpm ?? null} size={26} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { flex: 1, gap: 2 },
});
