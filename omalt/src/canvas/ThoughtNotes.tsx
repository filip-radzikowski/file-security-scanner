import { format } from 'date-fns';
import { router } from 'expo-router';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { AppText } from '../components/AppText';
import type { Entry } from '../db/schema';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fixedSurfaceFontScale, hairlineWidth, radius, spacing } from '../theme';
import {
  CENTER,
  NOTE_CHAIN_START,
  NOTE_H,
  NOTE_OPACITY,
  NOTE_SLOTS,
  NOTE_W,
} from './constants';
import { Point, Rect, dotsBetween } from './layout';

function noteRect(i: number): Rect {
  const s = NOTE_SLOTS[i];
  return {
    left: CENTER + s.x - NOTE_W / 2 - 8,
    right: CENTER + s.x + NOTE_W / 2 + 8,
    top: CENTER + s.y - NOTE_H / 2 - 8,
    bottom: CENTER + s.y + NOTE_H / 2 + 8,
  };
}

function chainDots(count: number): Point[] {
  const dots: Point[] = [];
  let from: Point = NOTE_CHAIN_START;
  for (let i = 0; i < count; i++) {
    const to = { x: CENTER + NOTE_SLOTS[i].x, y: CENTER + NOTE_SLOTS[i].y };
    dots.push(...dotsBetween(from, to, [noteRect(i), ...(i > 0 ? [noteRect(i - 1)] : [])], 18));
    from = to;
  }
  return dots;
}

const Note = memo(function Note({ entry, index }: { entry: Entry; index: number }) {
  const slot = NOTE_SLOTS[index];
  // Only animate a note that was just written, not one scrolling back into view.
  const fresh = useMemo(() => Math.abs(Date.now() - entry.createdAt) < 4000, [entry.createdAt]);
  return (
    <Animated.View
      entering={fresh ? FadeInDown.duration(500) : undefined}
      layout={LinearTransition.duration(450)}
      style={[
        styles.wrap,
        {
          left: CENTER + slot.x - NOTE_W / 2,
          top: CENTER + slot.y - NOTE_H / 2,
        },
      ]}
    >
      <Pressable
        onPress={() => router.push({ pathname: '/thought/[id]', params: { id: entry.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Your entry: ${entry.text}`}
        accessibilityHint="Opens this thought"
        // Opacity lives here, not on the animated wrapper, which fades in via `entering`.
        style={({ pressed }) => [styles.note, { opacity: NOTE_OPACITY[index] }, pressed && styles.pressed]}
      >
        <AppText variant="small" numberOfLines={2} maxFontSizeMultiplier={fixedSurfaceFontScale}>
          {entry.text}
        </AppText>
        <View style={styles.foot}>
          <AppText variant="label" tone="soft" maxFontSizeMultiplier={fixedSurfaceFontScale}>
            {format(entry.createdAt, 'd MMM \u00B7 HH:mm')}
          </AppText>
          <AppText variant="label" tone="sage" maxFontSizeMultiplier={fixedSurfaceFontScale}>
            Open {'\u203A'}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
});

/** The last few entries, floating up from the wordmark and fading with age. */
export const ThoughtNotes = memo(function ThoughtNotes() {
  const entries = useOmaltStore((s) => s.entries);
  const recent = useMemo(() => entries.slice(-NOTE_SLOTS.length).reverse(), [entries]);
  const chain = useMemo(() => chainDots(recent.length), [recent.length]);

  return (
    <>
      <View pointerEvents="none" style={styles.chain} importantForAccessibility="no-hide-descendants">
        {chain.map((d, i) => (
          <View key={i} style={[styles.dot, { left: d.x - 2, top: d.y - 2 }]} />
        ))}
      </View>
      {recent.map((e, i) => (
        <Note key={e.id} entry={e} index={i} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  chain: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.trail,
    opacity: 0.45,
  },
  wrap: { position: 'absolute', width: NOTE_W },
  note: {
    minHeight: NOTE_H,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: 2,
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.sandSoft,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pressed: { backgroundColor: colors.sand },
});
