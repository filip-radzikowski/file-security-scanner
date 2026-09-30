import { memo, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { SharedValue, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../components/AppText';
import { Composer } from '../components/Composer';
import { GrowthHint } from '../components/GrowthHint';
import { SuggestionPrompt } from '../components/SuggestionPrompt';
import type { ModuleData } from '../modules/types';
import { useOmaltStore } from '../store/useOmaltStore';
import { AmbientDots } from './AmbientDots';
import { CanvasCard } from './CanvasCard';
import { ThoughtNotes } from './ThoughtNotes';
import { Trail } from './Trail';
import {
  CENTER,
  COMPOSER_H,
  COMPOSER_W,
  CULL_CELL,
  CULL_MARGIN,
  HEADER_H,
  NOTE_H,
  NOTE_SLOTS,
  NOTE_W,
} from './constants';
import { Rect, cardRect, intersects, trailRect } from './layout';

const CELL_STRIDE = 1000;

const NOTES_AREA: Rect = {
  left: CENTER - NOTE_W,
  right: CENTER + NOTE_W,
  top: CENTER + NOTE_SLOTS[NOTE_SLOTS.length - 1].y - NOTE_H,
  bottom: CENTER - 100,
};

interface Props {
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  lift: SharedValue<number>;
  width: number;
  height: number;
  onPressIn: () => void;
  onOpen: (id: string) => void;
  onAccepted: (moduleId: string) => void;
}

/**
 * Everything drawn inside the world. It owns the viewport-culling state, so crossing a
 * grid cell while the canvas glides re-renders only this subtree, never the gesture layer.
 */
export const WorldContent = memo(function WorldContent({
  tx,
  ty,
  lift,
  width,
  height,
  onPressIn,
  onOpen,
  onAccepted,
}: Props) {
  const modules = useOmaltStore((s) => s.modules);
  const tasks = useOmaltStore((s) => s.tasks);
  const moods = useOmaltStore((s) => s.moods);
  const data: ModuleData = useMemo(() => ({ tasks, moods }), [tasks, moods]);

  const [cellKey, setCellKey] = useState(() => {
    const cx = Math.floor(-tx.value / CULL_CELL);
    const cy = Math.floor(-ty.value / CULL_CELL);
    return cx * CELL_STRIDE + cy;
  });
  useAnimatedReaction(
    () => Math.floor(-tx.value / CULL_CELL) * CELL_STRIDE + Math.floor(-(ty.value - lift.value) / CULL_CELL),
    (key, prev) => {
      if (key !== prev) scheduleOnRN(setCellKey, key);
    },
  );

  const viewRect: Rect = useMemo(() => {
    const cx = Math.floor(cellKey / CELL_STRIDE);
    const cy = cellKey - cx * CELL_STRIDE;
    return {
      left: cx * CULL_CELL - CULL_MARGIN,
      top: cy * CULL_CELL - CULL_MARGIN,
      right: (cx + 1) * CULL_CELL + width + CULL_MARGIN,
      bottom: (cy + 1) * CULL_CELL + height + CULL_MARGIN,
    };
  }, [cellKey, width, height]);

  const visible = useMemo(
    () =>
      modules.map((m) => ({
        module: m,
        showCard: intersects(cardRect(m), viewRect),
        showTrail: intersects(trailRect(m), viewRect),
      })),
    [modules, viewRect],
  );

  const showNotes = intersects(NOTES_AREA, viewRect);

  return (
    <>
      {/* Tapping empty canvas dismisses the keyboard. Sits under everything else. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={Keyboard.dismiss}
        accessible={false}
        importantForAccessibility="no"
      />

      <AmbientDots rect={viewRect} />

      {visible.map(({ module, showTrail }) =>
        showTrail ? <Trail key={`trail-${module.id}`} x={module.x} y={module.y} /> : null,
      )}

      {showNotes ? <ThoughtNotes /> : null}

      <View style={styles.header} pointerEvents="none">
        <AppText variant="wordmark" accessibilityRole="header">
          Omalt
        </AppText>
        <AppText variant="small" tone="soft">
          Start blank. Become yours.
        </AppText>
      </View>

      <View style={styles.composer}>
        <Composer height={COMPOSER_H} />
      </View>

      <View style={styles.suggestion}>
        <SuggestionPrompt onAccepted={onAccepted} capFontScale emptyHint={<GrowthHint />} />
      </View>

      {visible.map(({ module, showCard }) =>
        showCard ? (
          <CanvasCard key={module.id} module={module} data={data} onPressIn={onPressIn} onOpen={onOpen} />
        ) : null,
      )}
    </>
  );
});

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    left: CENTER - COMPOSER_W / 2,
    top: CENTER - COMPOSER_H / 2 - HEADER_H,
    width: COMPOSER_W,
    height: HEADER_H - 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  composer: {
    position: 'absolute',
    left: CENTER - COMPOSER_W / 2,
    top: CENTER - COMPOSER_H / 2,
    width: COMPOSER_W,
  },
  suggestion: {
    position: 'absolute',
    left: CENTER - COMPOSER_W / 2,
    top: CENTER + COMPOSER_H / 2 + 14,
    width: COMPOSER_W,
  },
});
