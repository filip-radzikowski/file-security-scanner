import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fixedSurfaceFontScale, hairlineWidth, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';
import { NudgeCard } from './NudgeCard';
import { PillButton } from './PillButton';

/**
 * Sits under the text box whenever there is no suggestion to act on: announces a fresh
 * unlock, offers a quick check-in, or else nudges the user to keep writing.
 * With `bare`, it renders only the unlock notice or check-in (used by the list view).
 */
export function GrowthHint({ bare }: { bare?: boolean }) {
  const hasModules = useOmaltStore((s) => s.modules.some((m) => m.status !== 'locked'));
  const notice = useOmaltStore((s) => s.unlockNotice);
  const dismiss = useOmaltStore((s) => s.dismissUnlockNotice);
  const hasNudge = useOmaltStore((s) => s.activeNudge !== null);

  if (notice) {
    return (
      <View style={styles.notice} accessibilityLiveRegion="polite">
        <AppText variant="body" maxFontSizeMultiplier={fixedSurfaceFontScale}>
          {notice.title} is unlocked. It's on your canvas now.
        </AppText>
        <View style={styles.actions}>
          <PillButton
            label="Open"
            maxFontSizeMultiplier={fixedSurfaceFontScale}
            onPress={() => {
              dismiss();
              router.push({ pathname: '/module/[id]', params: { id: notice.moduleId } });
            }}
          />
          <PillButton label="Later" kind="secondary" maxFontSizeMultiplier={fixedSurfaceFontScale} onPress={dismiss} />
        </View>
      </View>
    );
  }

  if (hasNudge) return <NudgeCard capFontScale={!bare} />;
  if (bare) return null;

  return (
    <AppText variant="small" tone="soft" style={styles.hint} maxFontSizeMultiplier={fixedSurfaceFontScale}>
      {hasModules
        ? 'Keep writing. Your canvas grows as Omalt notices more.'
        : 'Keep writing, and Omalt will suggest what to add here.'}
    </AppText>
  );
}

const styles = StyleSheet.create({
  hint: { textAlign: 'center', paddingHorizontal: spacing.xl },
  notice: {
    backgroundColor: colors.ivory,
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    borderColor: colors.sage,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
