import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Point, trailDots } from './layout';

const DOT = 5;

/** Faint dotted line from the centre to a card. */
export const Trail = memo(function Trail({ x, y }: { x: number; y: number }) {
  const dots = useMemo(() => trailDots({ x, y }), [x, y]);
  return (
    <View pointerEvents="none" style={styles.layer} importantForAccessibility="no-hide-descendants">
      {dots.map((d: Point, i: number) => (
        <View key={i} style={[styles.dot, { left: d.x - DOT / 2, top: d.y - DOT / 2 }]} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.trail,
    opacity: 0.55,
  },
});
