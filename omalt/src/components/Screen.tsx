import { ReactNode } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  children: ReactNode;
  contentStyle?: ViewStyle;
}

/** Scrolling page used by every dashboard and settings. */
export function Screen({ children, contentStyle }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
});
