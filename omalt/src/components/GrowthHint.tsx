import { StyleSheet } from 'react-native';
import { useOmaltStore } from '../store/useOmaltStore';
import { fixedSurfaceFontScale, spacing } from '../theme';
import { AppText } from './AppText';

/** Quiet nudge shown under the text box whenever there is no suggestion to act on. */
export function GrowthHint() {
  const hasModules = useOmaltStore((s) => s.modules.length > 0);
  return (
    <AppText
      variant="small"
      tone="soft"
      style={styles.hint}
      maxFontSizeMultiplier={fixedSurfaceFontScale}
    >
      {hasModules
        ? 'Keep writing. Your canvas grows as Omalt notices more.'
        : 'Keep writing, and Omalt will suggest what to add here.'}
    </AppText>
  );
}

const styles = StyleSheet.create({
  hint: { textAlign: 'center', paddingHorizontal: spacing.xl },
});
