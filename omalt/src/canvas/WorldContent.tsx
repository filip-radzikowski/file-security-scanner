import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  CHUNK,
  HEADER_H,
  NOTE_H,
  NOTE_OPEN_MAX_H,
  NOTE_SLOTS,
  NOTE_W,
} from './constants';
import { Rect, cardRect, intersects, trailRect } from './layout';

const CHUNK_STRIDE = 100;

const NOTES_AREA: Rect = {
  left: CENTER - NOTE_W,
  right: CENTER + NOTE_W,
  top: CENTER + NOTE_SLOTS[NOTE_SLOTS.length - 1].y - NOTE_OPEN_MAX_H,
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
  const entries = useOmaltStore((s) => s.entries);
  const items = useOmaltStore((s) => s.items);
  const health = useOmaltStore((s) => s.healthDaily);
  const heart = useOmaltStore((s) => s.heart);
  const data: ModuleData = useMemo(
    () => ({ tasks, moods, entries, items, health, heart }),
    [tasks, moods, entries, items, health, heart],
  );

  // Which chunk holds the centre of the viewport. Only a change here triggers a re-render.
  const [chunkKey, setChunkKey] = useState(() => {
    const cx = Math.floor((-tx.value + width / 2) / CHUNK);
    const cy = Math.floor((-ty.value + height / 2) / CHUNK);
    return cx * CHUNK_STRIDE + cy;
  });
  useAnimatedReaction(
    () =>
      Math.floor((-tx.value + width / 2) / CHUNK) * CHUNK_STRIDE +
      Math.floor((-(ty.value - lift.value) + height / 2) / CHUNK),
    (key, prev) => {
      if (key !== prev) scheduleOnRN(setChunkKey, key);
    },
  );

  const viewRect: Rect = useMemo(() => {
    const cx = Math.floor(chunkKey / CHUNK_STRIDE);
    const cy = chunkKey - cx * CHUNK_STRIDE;
    return {
      left: (cx - 1) * CHUNK,
      top: (cy - 1) * CHUNK,
      right: (cx + 2) * CHUNK,
      bottom: (cy + 2) * CHUNK,
    };
  }, [chunkKey]);

  // Every card's footprint, with a little breathing room. Dots and trails steer clear of them.
  const cardRects: Rect[] = useMemo(
    () =>
      modules.map((m) => {
        const r = cardRect(m);
        return { left: r.left - 14, right: r.right + 14, top: r.top - 14, bottom: r.bottom + 14 };
      }),
    [modules],
  );

  // Stable per-card lists so each Trail's dots are only recomputed when the cards change.
  const othersFor = useMemo(() => cardRects.map((_, i) => cardRects.filter((__, j) => j !== i)), [cardRects]);

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
      <AmbientDots rect={viewRect} avoid={cardRects} />

      {visible.map(({ module, showTrail }, i) =>
        showTrail ? (
          <Trail
            key={`trail-${module.id}`}
            x={module.x}
            y={module.y}
            others={othersFor[i]}
          />
        ) : null,
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
