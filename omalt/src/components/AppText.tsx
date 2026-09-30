import { ReactNode } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, maxFontScale, typography } from '../theme';

export type TextVariant = keyof typeof typography;
export type TextTone = 'ink' | 'soft' | 'sage' | 'onSage' | 'sand' | 'danger';

const toneColor: Record<TextTone, string> = {
  ink: colors.ink,
  soft: colors.inkSoft,
  sage: colors.sageDeep,
  onSage: colors.onSage,
  sand: colors.sandDeep,
  danger: colors.danger,
};

interface Props extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  children?: ReactNode;
}

/** Themed text. Honours the user's Dynamic Type setting up to `maxFontScale` unless overridden. */
export function AppText({ variant = 'body', tone = 'ink', style, maxFontSizeMultiplier, ...rest }: Props) {
  const base: TextStyle = { ...typography[variant], color: toneColor[tone] };
  return <Text {...rest} maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxFontScale} style={[base, style]} />;
}
