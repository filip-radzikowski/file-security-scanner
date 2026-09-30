import { memo, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { ambientDotsIn } from './ambient';
import { CHUNK } from './constants';
import { Rect } from './layout';

const Chunk = memo(function Chunk({ cx, cy, avoid }: { cx: number; cy: number; avoid: Rect[] }) {
  const dots = useMemo(
    // The far edge is exclusive so neighbouring chunks never generate the same cell twice.
    () =>
      ambientDotsIn({ left: cx * CHUNK, right: (cx + 1) * CHUNK - 1, top: cy * CHUNK, bottom: (cy + 1) * CHUNK - 1 }).filter(
        (d) => !avoid.some((r) => d.x > r.left && d.x < r.right && d.y > r.top && d.y < r.bottom),
      ),
    [cx, cy, avoid],
  );
  return (
    <>
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
    </>
  );
});

/**
 * Quiet scatter of dots across the whole canvas, so it feels like one connected field.
 * Chunks are only ever added (never unmounted), so panning back over old ground costs nothing.
 */
export const AmbientDots = memo(function AmbientDots({ rect, avoid }: { rect: Rect; avoid: Rect[] }) {
  const visited = useRef(new Set<string>());
  for (let cx = Math.floor(rect.left / CHUNK); cx < Math.ceil(rect.right / CHUNK); cx++) {
    for (let cy = Math.floor(rect.top / CHUNK); cy < Math.ceil(rect.bottom / CHUNK); cy++) {
      visited.current.add(`${cx}:${cy}`);
    }
  }
  return (
    <View pointerEvents="none" style={styles.layer} importantForAccessibility="no-hide-descendants">
      {[...visited.current].map((k) => {
        const [cx, cy] = k.split(':').map(Number);
        return <Chunk key={k} cx={cx} cy={cy} avoid={avoid} />;
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
});
