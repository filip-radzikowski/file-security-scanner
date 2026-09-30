import { ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fixedSurfaceFontScale, hairlineWidth, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';
import { PillButton } from './PillButton';

interface Props {
  /** Called with the new module's id after the user taps Add. */
  onAccepted?: (moduleId: string) => void;
  /** Canvas cards are fixed-size, so text scaling is capped there. */
  capFontScale?: boolean;
  /** Shown in place of the card when nothing is pending. */
  emptyHint?: ReactNode;
}

/** Shows the oldest pending suggestion with Add / Not now. */
export function SuggestionPrompt({ onAccepted, capFontScale, emptyHint }: Props) {
  const suggestions = useOmaltStore((s) => s.suggestions);
  const accept = useOmaltStore((s) => s.acceptSuggestion);
  const dismiss = useOmaltStore((s) => s.dismissSuggestion);
  const pending = useMemo(() => suggestions.find((s) => s.status === 'pending'), [suggestions]);
  const cap = capFontScale ? fixedSurfaceFontScale : undefined;

  if (!pending) return <>{emptyHint ?? null}</>;

  return (
    <Animated.View
      key={pending.id}
      entering={FadeInDown.duration(350)}
      style={styles.card}
      accessibilityLiveRegion="polite"
    >
      <AppText variant="body" maxFontSizeMultiplier={cap}>
        {pending.reason}
      </AppText>
      <View style={styles.actions}>
        <PillButton
          label="Add"
          maxFontSizeMultiplier={cap}
          accessibilityHint="Adds this module to your canvas"
          onPress={async () => {
            const id = await accept(pending.id);
            if (id) onAccepted?.(id);
          }}
        />
        <PillButton label="Not now" kind="secondary" maxFontSizeMultiplier={cap} onPress={() => dismiss(pending.id)} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ivory,
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
