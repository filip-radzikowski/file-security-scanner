import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '../../components/AppText';
import { colors } from '../../theme';
import { pulseMs } from './schema';

interface Props {
  bpm: number | null;
  size: number;
  /** Show the number inside the dot. */
  showNumber?: boolean;
}

/**
 * A soft dot that beats at the given heart rate: two quick beats then a rest ("lub-dub"),
 * plus a ring that ripples out each cycle. The beat length is 60000 / bpm. When the phone's
 * Reduce Motion is on, Reanimated leaves it still.
 */
export function PulsingHeart({ bpm, size, showNumber }: Props) {
  const scale = useSharedValue(1);
  const ripple = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(ripple);
    scale.value = 1;
    ripple.value = 0;
    if (!bpm) return;
    const d = pulseMs(bpm);
    scale.value = withRepeat(
      withSequence(
        withTiming(1.16, { duration: d * 0.12 }),
        withTiming(1, { duration: d * 0.12 }),
        withTiming(1.1, { duration: d * 0.12 }),
        withTiming(1, { duration: d * 0.64 }),
      ),
      -1,
      false,
    );
    ripple.value = withRepeat(withTiming(1, { duration: d }), -1, false);
  }, [bpm, scale, ripple]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - ripple.value) * 0.4,
    transform: [{ scale: 1 + ripple.value * 0.8 }],
  }));

  return (
    <View style={{ width: size * 1.8, height: size * 1.8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.center}>
        <Animated.View
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ringStyle]}
          pointerEvents="none"
        />
        <Animated.View style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }, dotStyle]}>
          {showNumber && bpm ? (
            <AppText variant="heading" tone="onSage" allowFontScaling={false}>
              {bpm}
            </AppText>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', backgroundColor: colors.sage },
  dot: { backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
});
