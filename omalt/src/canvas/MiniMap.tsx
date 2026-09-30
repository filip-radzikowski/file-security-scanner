import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { ModuleRecord } from '../db/schema';
import { colors, hairlineWidth, radius } from '../theme';
import { CENTER } from './constants';

const SIZE = 104;
const MIN_HALF_EXTENT = 900;

interface Props {
  modules: ModuleRecord[];
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  viewW: SharedValue<number>;
  viewH: SharedValue<number>;
}

/**
 * Small overview of the populated part of the world with the current viewport outlined.
 * The map zooms out as cards spread further from the centre.
 */
export const MiniMap = memo(function MiniMap({ modules, tx, ty, viewW, viewH }: Props) {
  const half = useMemo(() => {
    const farthest = modules.reduce((m, c) => Math.max(m, Math.abs(c.x - CENTER), Math.abs(c.y - CENTER)), 0);
    return Math.max(MIN_HALF_EXTENT, farthest + 400);
  }, [modules]);

  const scale = useSharedValue(SIZE / (2 * half));
  const origin = useSharedValue(CENTER - half);
  useEffect(() => {
    scale.value = SIZE / (2 * half);
    origin.value = CENTER - half;
  }, [half, scale, origin]);

  const viewport = useAnimatedStyle(() => ({
    left: (-tx.value - origin.value) * scale.value,
    top: (-ty.value - origin.value) * scale.value,
    width: viewW.value * scale.value,
    height: viewH.value * scale.value,
  }));

  const k = SIZE / (2 * half);
  return (
    <View
      style={styles.map}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.centre, { left: (CENTER - (CENTER - half)) * k - 3, top: (CENTER - (CENTER - half)) * k - 3 }]} />
      {modules.map((m) => (
        <View
          key={m.id}
          style={[styles.card, { left: (m.x - (CENTER - half)) * k - 3, top: (m.y - (CENTER - half)) * k - 3 }]}
        />
      ))}
      <Animated.View style={[styles.viewport, viewport]} />
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.overlay,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  centre: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
  card: { position: 'absolute', width: 6, height: 6, borderRadius: 2, backgroundColor: colors.sage },
  viewport: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.sageDeep,
    backgroundColor: colors.sageSoft,
    opacity: 0.85,
    borderRadius: 2,
  },
});
