import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, hairlineWidth, radius, shadows, spacing } from '../theme';

/** Ivory rounded surface with a hairline border and a very soft shadow. */
export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.card,
  },
});
