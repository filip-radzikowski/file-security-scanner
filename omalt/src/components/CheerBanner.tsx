import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, hairlineWidth, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';

const VISIBLE_MS = 4500;

/** Omalt's short, warm messages. Slides in over any screen, then leaves on its own. */
export function CheerBanner() {
  const cheer = useOmaltStore((s) => s.cheer);
  const clear = useOmaltStore((s) => s.clearCheer);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!cheer) return;
    AccessibilityInfo.announceForAccessibility(cheer.message);
    const t = setTimeout(clear, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [cheer, clear]);

  if (!cheer) return null;
  return (
    <Animated.View
      key={cheer.id}
      entering={FadeInUp.duration(350)}
      exiting={FadeOutUp.duration(250)}
      pointerEvents="none"
      style={[styles.banner, { top: insets.top + spacing.sm }]}
    >
      <AppText variant="bodyStrong" tone="ink" style={styles.text}>
        {cheer.message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.ivory,
    borderWidth: hairlineWidth,
    borderColor: colors.sage,
    zIndex: 100,
    ...shadows.lifted,
  },
  text: { textAlign: 'center' },
});
