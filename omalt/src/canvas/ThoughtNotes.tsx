import { format } from 'date-fns';
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Reflection, aiService } from '../ai';
import { AppText } from '../components/AppText';
import { PillButton } from '../components/PillButton';
import type { Entry } from '../db/schema';
import { thoughtChips } from '../lib/thoughtChips';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fixedSurfaceFontScale, hairlineWidth, radius, spacing } from '../theme';
import {
  CENTER,
  NOTE_CHAIN_START,
  NOTE_GAP,
  NOTE_H,
  NOTE_OPACITY,
  NOTE_OPEN_MAX_H,
  NOTE_OPEN_W,
  NOTE_SLOTS,
  NOTE_W,
} from './constants';
import { Point, Rect, dotsBetween } from './layout';

const CAP = fixedSurfaceFontScale;
const OPEN_LINES = 6;
const CHARS_PER_LINE = 30;

interface Placed {
  entry: Entry;
  left: number;
  top: number;
  width: number;
  height: number;
  open: boolean;
  chips: string[];
}

/** Height of an expanded note, from its text: header + text + chips + reflection + buttons. */
function openHeight(text: string, chipCount: number): number {
  const lines = Math.min(OPEN_LINES, Math.max(1, Math.ceil(text.length / CHARS_PER_LINE)));
  return Math.min(NOTE_OPEN_MAX_H, 176 + lines * 20 + (chipCount > 0 ? 38 : 0));
}

/**
 * Stacks the notes upward from the newest, one gap apart. Expanding a note makes it taller
 * and pushes every older note up by the extra height, so nothing ever overlaps.
 */
function placeNotes(recent: Entry[], openId: string | null, chipsOf: (e: Entry) => string[]): Placed[] {
  const out: Placed[] = [];
  let bottom = CENTER + NOTE_SLOTS[0].y + NOTE_H / 2;
  recent.forEach((entry, i) => {
    const open = entry.id === openId;
    const chips = open ? chipsOf(entry) : [];
    const height = open ? openHeight(entry.text, chips.length) : NOTE_H;
    const width = open ? NOTE_OPEN_W : NOTE_W;
    const top = bottom - height;
    // Closed notes zig-zag; an open one centres on the column so it has room to breathe.
    const centreX = open ? CENTER : CENTER + NOTE_SLOTS[i].x;
    out.push({ entry, left: centreX - width / 2, top, width, height, open, chips });
    bottom = top - NOTE_GAP;
  });
  return out;
}

function chainDots(placed: Placed[]): Point[] {
  const dots: Point[] = [];
  let from: Point = NOTE_CHAIN_START;
  const pad = (p: Placed): Rect => ({
    left: p.left - 8,
    right: p.left + p.width + 8,
    top: p.top - 8,
    bottom: p.top + p.height + 8,
  });
  placed.forEach((p, i) => {
    const to = { x: p.left + p.width / 2, y: p.top + p.height / 2 };
    dots.push(...dotsBetween(from, to, [pad(p), ...(i > 0 ? [pad(placed[i - 1])] : [])], 18));
    from = to;
  });
  return dots;
}

function OpenBody({ p, onClose }: { p: Placed; onClose: () => void }) {
  const [reflection, setReflection] = useState<Reflection | null>(null);
  useEffect(() => {
    let live = true;
    aiService.reflectOnEntry(p.entry.text).then((r) => live && setReflection(r));
    return () => {
      live = false;
    };
  }, [p.entry.text]);

  return (
    <Animated.View entering={FadeIn.duration(260).delay(140)} exiting={FadeOut.duration(100)} style={styles.openBody}>
      <AppText variant="label" tone="soft" maxFontSizeMultiplier={CAP}>
        {format(p.entry.createdAt, 'EEE d MMM · HH:mm').toUpperCase()}
      </AppText>
      <AppText variant="small" numberOfLines={OPEN_LINES} maxFontSizeMultiplier={CAP} style={styles.openText}>
        {p.entry.text}
      </AppText>
      {p.chips.length > 0 ? (
        <AppText variant="small" tone="sage" numberOfLines={1} maxFontSizeMultiplier={CAP}>
          {p.chips.slice(0, 3).join('  ·  ')}
        </AppText>
      ) : null}
      <AppText variant="small" tone="soft" numberOfLines={3} maxFontSizeMultiplier={CAP} style={styles.says}>
        {reflection ? `Omalt: ${reflection.reflection}` : ''}
      </AppText>
      <View style={styles.buttons}>
        <PillButton
          label="Open"
          maxFontSizeMultiplier={CAP}
          accessibilityLabel="Open this thought"
          onPress={() => router.push({ pathname: '/thought/[id]', params: { id: p.entry.id } })}
          style={styles.smallButton}
        />
        <PillButton label="Close" kind="secondary" maxFontSizeMultiplier={CAP} onPress={onClose} style={styles.smallButton} />
      </View>
    </Animated.View>
  );
}

const Note = memo(function Note({
  p,
  index,
  onToggle,
}: {
  p: Placed;
  index: number;
  onToggle: (id: string) => void;
}) {
  const { entry, open } = p;
  // Only animate in a note that was just written, not one scrolling back into view.
  const fresh = useMemo(() => Math.abs(Date.now() - entry.createdAt) < 4000, [entry.createdAt]);
  return (
    <Animated.View
      entering={fresh ? FadeInDown.duration(500) : undefined}
      layout={LinearTransition.duration(380)}
      style={[styles.wrap, { left: p.left, top: p.top, width: p.width, height: p.height, zIndex: open ? 5 : 0 }]}
    >
      <Pressable
        onPress={() => onToggle(entry.id)}
        accessibilityRole="button"
        accessibilityLabel={`Your entry: ${entry.text}`}
        accessibilityHint={open ? 'Collapses this note' : 'Expands this note'}
        accessibilityState={{ expanded: open }}
        // Opacity lives here, not on the animated wrapper, which fades in via `entering`.
        style={({ pressed }) => [
          styles.note,
          { opacity: open ? 1 : NOTE_OPACITY[index] },
          open && styles.noteOpen,
          pressed && styles.pressed,
        ]}
      >
        {open ? (
          <OpenBody p={p} onClose={() => onToggle(entry.id)} />
        ) : (
          <>
            <AppText variant="small" numberOfLines={2} maxFontSizeMultiplier={CAP}>
              {entry.text}
            </AppText>
            <View style={styles.foot}>
              <AppText variant="label" tone="soft" maxFontSizeMultiplier={CAP}>
                {format(entry.createdAt, 'd MMM · HH:mm')}
              </AppText>
              <AppText variant="label" tone="sage" maxFontSizeMultiplier={CAP}>
                Tap to open {'›'}
              </AppText>
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
});

/** The last few entries, floating up from the wordmark. Tap one to expand it in place. */
export const ThoughtNotes = memo(function ThoughtNotes() {
  const entries = useOmaltStore((s) => s.entries);
  const items = useOmaltStore((s) => s.items);
  const [openId, setOpenId] = useState<string | null>(null);

  const recent = useMemo(() => entries.slice(-NOTE_SLOTS.length).reverse(), [entries]);
  // If the open note scrolls out of the list (a newer entry pushed it off), close it.
  const effectiveOpen = recent.some((e) => e.id === openId) ? openId : null;

  const placed = useMemo(
    () => placeNotes(recent, effectiveOpen, (e) => thoughtChips(e, items)),
    [recent, effectiveOpen, items],
  );
  const chain = useMemo(() => chainDots(placed), [placed]);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <>
      {/* Re-keyed on every layout so the dots fade back in once the notes have settled. */}
      <Animated.View
        key={`chain-${effectiveOpen ?? 'none'}-${recent.length}`}
        entering={FadeIn.duration(250).delay(effectiveOpen === null && recent.length <= 1 ? 0 : 380)}
        pointerEvents="none"
        style={styles.chain}
        importantForAccessibility="no-hide-descendants"
      >
        {chain.map((d, i) => (
          <View key={i} style={[styles.dot, { left: d.x - 2, top: d.y - 2 }]} />
        ))}
      </Animated.View>
      {placed.map((p, i) => (
        <Note key={p.entry.id} p={p} index={i} onToggle={toggle} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  chain: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.trail,
    opacity: 0.45,
  },
  wrap: { position: 'absolute' },
  note: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    gap: 2,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.md,
    backgroundColor: colors.sandSoft,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  noteOpen: { justifyContent: 'flex-start', backgroundColor: colors.ivory, borderColor: colors.sage },
  openBody: { flex: 1, gap: 6 },
  openText: { lineHeight: 20 },
  says: { minHeight: 54 },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  smallButton: { paddingHorizontal: spacing.lg },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pressed: { backgroundColor: colors.sand },
});
