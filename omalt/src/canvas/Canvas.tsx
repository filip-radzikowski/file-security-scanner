import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../components/AppText';
import { Composer } from '../components/Composer';
import { SuggestionPrompt } from '../components/SuggestionPrompt';
import type { ModuleData } from '../modules/types';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, shadows, spacing } from '../theme';
import { CanvasCard } from './CanvasCard';
import { MiniMap } from './MiniMap';
import { Trail } from './Trail';
import {
  CARD_H,
  CARD_W,
  CENTER,
  COMPOSER_H,
  COMPOSER_W,
  CULL_CELL,
  CULL_MARGIN,
  HEADER_H,
  WORLD_SIZE,
} from './constants';
import { Rect, cardRect, intersects, trailRect } from './layout';

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

const CELL_STRIDE = 1000;

export function Canvas() {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();

  const modules = useOmaltStore((s) => s.modules);
  const tasks = useOmaltStore((s) => s.tasks);
  const moods = useOmaltStore((s) => s.moods);
  const savePanCenter = useOmaltStore((s) => s.savePanCenter);
  const data: ModuleData = useMemo(() => ({ tasks, moods }), [tasks, moods]);

  // Viewport size. Shared values feed the UI-thread gesture code; state feeds culling.
  const viewW = useSharedValue(win.width);
  const viewH = useSharedValue(win.height);
  const [size, setSize] = useState({ w: win.width, h: win.height });

  // World offset (translation of the 6000x6000 world). Restored from the last saved pan.
  const initial = useRef(useOmaltStore.getState().panCenter).current;
  const tx = useSharedValue(clamp(win.width / 2 - initial.x, win.width - WORLD_SIZE, 0));
  const ty = useSharedValue(clamp(win.height / 2 - initial.y, win.height - WORLD_SIZE, 0));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  /** Temporary upward shift that keeps the text box above the keyboard. */
  const lift = useSharedValue(0);

  const persist = useCallback(() => {
    savePanCenter(Math.round(viewW.value / 2 - tx.value), Math.round(viewH.value / 2 - ty.value));
  }, [savePanCenter, viewW, viewH, tx, ty]);

  // ---- culling: re-render the visible set only when the viewport crosses a grid cell ----
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
      right: (cx + 1) * CULL_CELL + size.w + CULL_MARGIN,
      bottom: (cy + 1) * CULL_CELL + size.h + CULL_MARGIN,
    };
  }, [cellKey, size]);

  const visible = useMemo(
    () =>
      modules.map((m) => ({
        module: m,
        showCard: intersects(cardRect(m), viewRect),
        showTrail: intersects(trailRect(m), viewRect),
      })),
    [modules, viewRect],
  );

  // ---- pan with momentum, clamped to the world ----
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(8)
        .onBegin(() => {
          cancelAnimation(tx);
          cancelAnimation(ty);
        })
        .onStart(() => {
          startX.value = tx.value;
          startY.value = ty.value;
        })
        .onUpdate((e) => {
          tx.value = clamp(startX.value + e.translationX, viewW.value - WORLD_SIZE, 0);
          ty.value = clamp(startY.value + e.translationY, viewH.value - WORLD_SIZE, 0);
        })
        .onEnd((e) => {
          tx.value = withDecay(
            { velocity: e.velocityX, clamp: [viewW.value - WORLD_SIZE, 0], deceleration: 0.997 },
            (finished) => {
              if (finished) scheduleOnRN(persist);
            },
          );
          ty.value = withDecay(
            { velocity: e.velocityY, clamp: [viewH.value - WORLD_SIZE, 0], deceleration: 0.997 },
            (finished) => {
              if (finished) scheduleOnRN(persist);
            },
          );
        }),
    [tx, ty, startX, startY, viewW, viewH, persist],
  );

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value - lift.value }],
  }));

  // ---- keyboard: nudge the world so the text box stays visible ----
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      const keyboardTop = viewH.value - e.endCoordinates.height;
      const composerBottom = ty.value + CENTER + COMPOSER_H / 2 + 24;
      lift.value = withTiming(Math.max(0, composerBottom - keyboardTop), { duration: 250 });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      lift.value = withTiming(0, { duration: 250 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [lift, ty, viewH]);

  // ---- navigation helpers ----
  const pressAt = useRef({ x: 0, y: 0 });
  const handlePressIn = useCallback(() => {
    pressAt.current = { x: tx.value, y: ty.value };
  }, [tx, ty]);
  const handleOpen = useCallback(
    (id: string) => {
      // Belt and braces: ignore a "press" that happened while the canvas was moving.
      const moved = Math.hypot(tx.value - pressAt.current.x, ty.value - pressAt.current.y);
      if (moved > 6) return;
      router.push({ pathname: '/module/[id]', params: { id } });
    },
    [tx, ty],
  );

  const recentre = useCallback(() => {
    Keyboard.dismiss();
    const config = { duration: 500, easing: Easing.out(Easing.cubic) };
    tx.value = withTiming(viewW.value / 2 - CENTER, config);
    ty.value = withTiming(viewH.value / 2 - CENTER, config, (finished) => {
      if (finished) scheduleOnRN(persist);
    });
  }, [tx, ty, viewW, viewH, persist]);

  /** Pans just far enough to bring a newly added card fully into view. */
  const reveal = useCallback(
    (moduleId: string) => {
      const m = useOmaltStore.getState().modules.find((x) => x.id === moduleId);
      if (!m) return;
      const sx = m.x + tx.value;
      const sy = m.y + ty.value;
      const mx = CARD_W / 2 + 24;
      const top = insets.top + CARD_H / 2 + 24;
      const bottom = viewH.value - insets.bottom - CARD_H / 2 - 100;
      let dx = 0;
      let dy = 0;
      if (sx < mx) dx = mx - sx;
      else if (sx > viewW.value - mx) dx = viewW.value - mx - sx;
      if (sy < top) dy = top - sy;
      else if (sy > bottom) dy = bottom - sy;
      if (dx === 0 && dy === 0) return;
      const config = { duration: 600, easing: Easing.inOut(Easing.cubic) };
      tx.value = withTiming(clamp(tx.value + dx, viewW.value - WORLD_SIZE, 0), config);
      ty.value = withTiming(clamp(ty.value + dy, viewH.value - WORLD_SIZE, 0), config, (finished) => {
        if (finished) scheduleOnRN(persist);
      });
    },
    [tx, ty, viewW, viewH, insets.top, insets.bottom, persist],
  );

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        viewW.value = width;
        viewH.value = height;
        setSize((prev) => (prev.w === width && prev.h === height ? prev : { w: width, h: height }));
      }}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.world, worldStyle]}>
          {/* Tapping empty canvas dismisses the keyboard. Sits under everything else. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={Keyboard.dismiss}
            accessible={false}
            importantForAccessibility="no"
          />

          {visible.map(({ module, showTrail }) =>
            showTrail ? <Trail key={`trail-${module.id}`} x={module.x} y={module.y} /> : null,
          )}

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
            <SuggestionPrompt onAccepted={reveal} capFontScale />
          </View>

          {visible.map(({ module, showCard }) =>
            showCard ? (
              <CanvasCard
                key={module.id}
                module={module}
                data={data}
                onPressIn={handlePressIn}
                onOpen={handleOpen}
              />
            ) : null,
          )}
        </Animated.View>
      </GestureDetector>

      <View style={[styles.settings, { top: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <AppText variant="button" tone="ink" maxFontSizeMultiplier={1.3}>
            Settings
          </AppText>
        </Pressable>
      </View>

      <View style={[styles.minimap, { bottom: insets.bottom + spacing.lg }]}>
        <MiniMap modules={modules} tx={tx} ty={ty} viewW={viewW} viewH={viewH} />
      </View>

      <View style={[styles.recentre, { bottom: insets.bottom + spacing.lg }]}>
        <Pressable
          onPress={recentre}
          accessibilityRole="button"
          accessibilityLabel="Recentre canvas"
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <AppText variant="button" tone="ink" maxFontSizeMultiplier={1.3}>
            Recentre
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0, width: WORLD_SIZE, height: WORLD_SIZE },
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
  settings: { position: 'absolute', right: spacing.lg },
  minimap: { position: 'absolute', left: spacing.lg },
  recentre: { position: 'absolute', right: spacing.lg },
  pill: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  pillPressed: { backgroundColor: colors.ivoryPressed },
});
