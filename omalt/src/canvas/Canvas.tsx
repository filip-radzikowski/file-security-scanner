import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../components/AppText';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, shadows, spacing } from '../theme';
import { MiniMap } from './MiniMap';
import { WorldContent } from './WorldContent';
import { CARD_H, CARD_W, CENTER, COMPOSER_H, WORLD_SIZE } from './constants';

function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

const MAX_FLICK = 8000;
/** Closer to 1 glides longer. 0.998 is native iOS scroll deceleration; it keeps flowing after release. */
const DECELERATION = 0.998;

/**
 * Turns the release velocity (pt/s) into the glide's starting velocity. Harder flicks get a
 * small extra boost so they travel noticeably further, and the cap keeps them controllable.
 */
function flickVelocity(v: number): number {
  'worklet';
  const boost = 1 + Math.min(Math.abs(v) / 5000, 0.6);
  return clamp(v * boost, -MAX_FLICK, MAX_FLICK);
}


export function Canvas() {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();

  const modules = useOmaltStore((s) => s.modules);
  const savePanCenter = useOmaltStore((s) => s.savePanCenter);

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

  // ---- pan with momentum, clamped to the world ----
  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onBegin(() => {
          cancelAnimation(tx);
          cancelAnimation(ty);
        })
        .onStart(() => {
          startX.value = tx.value;
          startY.value = ty.value;
          scheduleOnRN(dismissKeyboard);
        })
        .onUpdate((e) => {
          tx.value = clamp(startX.value + e.translationX, viewW.value - WORLD_SIZE, 0);
          ty.value = clamp(startY.value + e.translationY, viewH.value - WORLD_SIZE, 0);
        })
        .onEnd((e) => {
          tx.value = withDecay(
            { velocity: flickVelocity(e.velocityX), clamp: [viewW.value - WORLD_SIZE, 0], deceleration: DECELERATION },
            (finished) => {
              if (finished) scheduleOnRN(persist);
            },
          );
          ty.value = withDecay(
            { velocity: flickVelocity(e.velocityY), clamp: [viewH.value - WORLD_SIZE, 0], deceleration: DECELERATION },
            (finished) => {
              if (finished) scheduleOnRN(persist);
            },
          );
        }),
    [tx, ty, startX, startY, viewW, viewH, persist, dismissKeyboard],
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
          <WorldContent
            tx={tx}
            ty={ty}
            lift={lift}
            width={size.w}
            height={size.h}
            onPressIn={handlePressIn}
            onOpen={handleOpen}
            onAccepted={reveal}
          />
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
