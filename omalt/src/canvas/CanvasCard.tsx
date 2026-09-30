import { memo, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { ModuleRecord } from '../db/schema';
import { getModuleDefinition } from '../modules/registry';
import type { ModuleData } from '../modules/types';
import { colors, hairlineWidth, radius, shadows } from '../theme';
import { CARD_H, CARD_W } from './constants';

interface Props {
  module: ModuleRecord;
  data: ModuleData;
  onPressIn: () => void;
  onOpen: (id: string) => void;
}

/**
 * A positioned, pressable module card. Uses a plain RN Pressable: the canvas pan gesture
 * activates only after 8pt of movement, and when it does the responder is cancelled, so
 * short taps open the card while drags pan.
 */
export const CanvasCard = memo(function CanvasCard({ module, data, onPressIn, onOpen }: Props) {
  const def = getModuleDefinition(module.type);
  // Only animate cards that were just created, not ones scrolling back into view.
  const fresh = useMemo(() => Date.now() - module.addedAt < 4000, [module.addedAt]);
  const summary = def.summarize(data);

  return (
    <Animated.View
      entering={fresh ? FadeIn.duration(500).delay(200) : undefined}
      style={[styles.wrap, { left: module.x - CARD_W / 2, top: module.y - CARD_H / 2 }]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPress={() => onOpen(module.id)}
        accessibilityRole="button"
        accessibilityLabel={`${module.title}. ${summary}`}
        accessibilityHint="Opens the full dashboard"
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <def.Card module={module} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'absolute', width: CARD_W, height: CARD_H },
  card: {
    flex: 1,
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    ...shadows.card,
  },
  pressed: { backgroundColor: colors.ivoryPressed },
});
