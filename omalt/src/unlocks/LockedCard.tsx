import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { cardStyles, cardTextScale } from '../components/CardFrame';
import type { CardProps } from '../modules/types';
import { fixedSurfaceFontScale, spacing } from '../theme';
import { useUnlockProgress } from './useUnlockProgress';

/** Canvas card for a module that isn't unlocked yet: shows how much is left. */
export function LockedCard({ module }: CardProps) {
  const unlock = useUnlockProgress(module.type);
  const pct = Math.round((unlock?.progress.fraction ?? 0) * 100);
  return (
    <View style={styles.frame}>
      <View>
        <AppText variant="label" tone="sand" maxFontSizeMultiplier={fixedSurfaceFontScale}>
          LOCKED
        </AppText>
        <AppText variant="heading" tone="soft" numberOfLines={1} maxFontSizeMultiplier={fixedSurfaceFontScale}>
          {module.title}
        </AppText>
      </View>
      <View style={styles.bottom}>
        <View style={cardStyles.track}>
          <View style={[cardStyles.fill, { width: `${pct}%` }]} />
        </View>
        <AppText variant="small" tone="soft" numberOfLines={1} maxFontSizeMultiplier={cardTextScale}>
          {unlock?.progress.remainingLabel ?? ''}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  bottom: { gap: spacing.sm },
});
