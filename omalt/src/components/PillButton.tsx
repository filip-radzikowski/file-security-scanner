import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, hairlineWidth, hitTarget, radius, spacing } from '../theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  maxFontSizeMultiplier?: number;
}

export function PillButton({
  label,
  onPress,
  kind = 'primary',
  disabled,
  accessibilityLabel,
  accessibilityHint,
  style,
  maxFontSizeMultiplier,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        kind === 'primary' && styles.primary,
        kind === 'secondary' && styles.secondary,
        kind === 'ghost' && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText
        variant="button"
        tone={kind === 'primary' ? 'onSage' : 'ink'}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.sage },
  secondary: { backgroundColor: colors.sand },
  ghost: { backgroundColor: colors.ivory, borderWidth: hairlineWidth, borderColor: colors.hairline },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.45 },
});
