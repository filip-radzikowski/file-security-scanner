import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../../components/AppText';
import { colors, fonts, radius, shadows, spacing } from '../../theme';
import { moodLabel } from './schema';

const THUMB = 34;
const TRACK_H = 14;
const HIT_H = 56;
const STOPS = [0, 0.25, 0.5, 0.75, 1];
const STOP_COLORS = [colors.mood[0], colors.mood[1], colors.mood[2], colors.mood[3], colors.mood[4]];

function clamp01(v: number): number {
  'worklet';
  return Math.min(1, Math.max(0, v));
}

function travelOf(trackWidth: number): number {
  'worklet';
  return Math.max(1, trackWidth - THUMB);
}

interface Props {
  /** Starting value, 0-100. */
  initial: number;
  /** Called with the rounded 0-100 value whenever it changes. */
  onChange: (value: number) => void;
  /** Word shown beside the number. Defaults to the mood words (Low ... Great). */
  wordFor?: (value: number) => string;
  /** Shown right after the number, e.g. "%". */
  suffix?: string;
  /** Screen-reader description of what is being set. */
  label?: string;
  /** Captions under the left end, the middle and the right end. */
  ends?: [string, string, string];
}

/** Drag-left-to-right feeling scale, 0 to 100. The thumb grows and the colour warms as you move. */
export function FeelingSlider({
  initial,
  onChange,
  wordFor = moodLabel,
  suffix = '',
  label = 'How do you feel, from 0 to 100',
  ends = ['0 · Low', '50', 'Great · 100'],
}: Props) {
  const [value, setValue] = useState(Math.round(initial));
  const pos = useSharedValue(Math.round(initial) / 100);
  const trackW = useSharedValue(0);
  const startPos = useSharedValue(0);
  const active = useSharedValue(0);

  const report = useCallback(
    (v: number) => {
      setValue(v);
      onChange(v);
    },
    [onChange],
  );

  // Follow external changes (e.g. today's logged value arriving after mount).
  useEffect(() => {
    const v = Math.round(initial);
    pos.value = withTiming(v / 100, { duration: 450 });
  }, [initial, pos]);

  useAnimatedReaction(
    () => Math.round(pos.value * 100),
    (v, prev) => {
      if (v !== prev) scheduleOnRN(report, v);
    },
  );

  // Memoised: re-creating gestures on every render would cancel a drag in progress.
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-18, 18])
      .onBegin(() => {
        active.value = withSpring(1, { damping: 14, stiffness: 220 });
      })
      .onStart(() => {
        startPos.value = pos.value;
      })
      .onUpdate((e) => {
        pos.value = clamp01(startPos.value + e.translationX / travelOf(trackW.value));
      })
      .onFinalize(() => {
        active.value = withSpring(0, { damping: 14, stiffness: 220 });
      });

    const tap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((e) => {
        pos.value = withTiming(clamp01((e.x - THUMB / 2) / travelOf(trackW.value)), { duration: 280 });
      });

    return Gesture.Race(pan, tap);
  }, [pos, startPos, trackW, active]);

  const onLayout = (e: LayoutChangeEvent) => {
    trackW.value = e.nativeEvent.layout.width;
  };

  const fillStyle = useAnimatedStyle(() => ({
    width: pos.value * travelOf(trackW.value) + THUMB / 2,
    backgroundColor: interpolateColor(pos.value, STOPS, STOP_COLORS),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * travelOf(trackW.value) }, { scale: 1 + active.value * 0.2 }],
    borderColor: interpolateColor(pos.value, STOPS, STOP_COLORS),
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pos.value * travelOf(trackW.value) + THUMB / 2 - BUBBLE_W / 2 },
      { translateY: -active.value * 6 },
      { scale: 0.92 + active.value * 0.14 },
    ],
  }));

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const step = e.nativeEvent.actionName === 'increment' ? 5 : -5;
    pos.value = withTiming(clamp01((value + step) / 100), { duration: 200 });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <AppText variant="display" accessibilityElementsHidden importantForAccessibility="no">
          {value}
          {suffix}
        </AppText>
        <AppText variant="heading" tone="soft" accessibilityElementsHidden importantForAccessibility="no">
          {wordFor(value)}
        </AppText>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          style={styles.hit}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}${suffix}, ${wordFor(value)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fillStyle]} />
          <Animated.View style={[styles.bubble, bubbleStyle]} pointerEvents="none">
            <AppText variant="small" tone="onSage" allowFontScaling={false} style={styles.bubbleText}>
              {value}
            </AppText>
          </Animated.View>
          <Animated.View style={[styles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>

      <View style={styles.ends} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppText variant="small" tone="soft">
          {ends[0]}
        </AppText>
        <AppText variant="small" tone="soft">
          {ends[1]}
        </AppText>
        <AppText variant="small" tone="soft">
          {ends[2]}
        </AppText>
      </View>
    </View>
  );
}

const BUBBLE_W = 40;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  hit: { height: HIT_H, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: colors.sandSoft,
    top: (HIT_H - TRACK_H) / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    top: (HIT_H - TRACK_H) / 2,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: (HIT_H - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.ivory,
    borderWidth: 3,
    ...shadows.lifted,
  },
  bubble: {
    position: 'absolute',
    left: 0,
    top: -2,
    width: BUBBLE_W,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 14 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
