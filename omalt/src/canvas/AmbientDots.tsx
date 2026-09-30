import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { ambientDotsIn } from './ambient';
import { Rect } from './layout';

/** Quiet scatter of dots across the whole canvas, so it feels like one connected field. */
export const AmbientDots = memo(function AmbientDots({ rect }: { rect: Rect }) {
  const dots = useMemo(() => ambientDotsIn(rect), [rect]);
  return (
    <View pointerEvents="none" style={styles.layer} importantForAccessibility="no-hide-descendants">
      {dots.map((d) => (
        <View
          key={d.key}
          style={{
            position: 'absolute',
            left: d.x - d.size / 2,
            top: d.y - d.size / 2,
            width: d.size,
            height: d.size,
            borderRadius: d.size / 2,
            opacity: d.opacity,
            backgroundColor: d.sage ? colors.sage : colors.ambient,
          }}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
});
