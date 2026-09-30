import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fixedSurfaceFontScale, spacing } from '../theme';
import { AppText } from './AppText';

interface Props {
  title: string;
  children?: ReactNode;
}

/** Shared inner layout for canvas cards (the ivory surface itself is drawn by the canvas). */
export function CardFrame({ title, children }: Props) {
  return (
    <View style={styles.frame}>
      <AppText variant="heading" numberOfLines={1} maxFontSizeMultiplier={fixedSurfaceFontScale}>
        {title}
      </AppText>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export const cardTextScale = fixedSurfaceFontScale;

const styles = StyleSheet.create({
  frame: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  body: { gap: spacing.sm },
});

export const cardStyles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: colors.sandSoft, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.sage },
});
