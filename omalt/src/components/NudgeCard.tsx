import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Nudge, nudgeById } from '../nudges/nudges';
import { useOmaltStore } from '../store/useOmaltStore';
import {
  colors,
  fixedSurfaceFontScale,
  fonts,
  hairlineWidth,
  hitTarget,
  radius,
  shadows,
  spacing,
} from '../theme';
import { AppText } from './AppText';
import { PillButton } from './PillButton';

function Chip({ label, onPress, cap }: { label: string; onPress: () => void; cap?: number }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
    >
      <AppText variant="button" maxFontSizeMultiplier={cap}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** A quick question with tappable answers or a text box. Every answer is written to the diary. */
function NudgeBody({ nudge, cap }: { nudge: Nudge; cap?: number }) {
  const answer = useOmaltStore((s) => s.answerNudge);
  const dismiss = useOmaltStore((s) => s.dismissNudge);
  const setNudgesEnabled = useOmaltStore((s) => s.setNudgesEnabled);
  const modules = useOmaltStore((s) => s.modules);
  const [stage, setStage] = useState<'ask' | 'more'>('ask');
  const [picked, setPicked] = useState<'yes' | 'no' | null>(null);
  const [text, setText] = useState('');

  useEffect(() => {
    setStage('ask');
    setPicked(null);
    setText('');
  }, [nudge.id]);

  const input = (placeholder: string, numeric?: boolean) => (
    <TextInput
      value={text}
      onChangeText={setText}
      placeholder={placeholder}
      placeholderTextColor={colors.inkSoft}
      keyboardType={numeric ? 'number-pad' : 'default'}
      multiline={!numeric}
      accessibilityLabel={placeholder}
      selectionColor={colors.sage}
      maxFontSizeMultiplier={cap}
      style={styles.input}
    />
  );

  if (nudge.kind === 'notify') {
    return (
      <View style={styles.actions}>
        <PillButton
          label="Yes, nudge me"
          maxFontSizeMultiplier={cap}
          onPress={async () => {
            dismiss();
            await setNudgesEnabled(true);
          }}
        />
        <PillButton label="Not now" kind="secondary" maxFontSizeMultiplier={cap} onPress={dismiss} />
      </View>
    );
  }

  if (nudge.kind === 'open' && nudge.open) {
    const target = modules.find((m) => m.type === nudge.open?.moduleType && m.status !== 'locked');
    return (
      <View style={styles.actions}>
        {target ? (
          <PillButton
            label={nudge.open.label}
            maxFontSizeMultiplier={cap}
            onPress={() => {
              dismiss();
              router.push({ pathname: '/module/[id]', params: { id: target.id } });
            }}
          />
        ) : null}
        <PillButton label="Not now" kind="secondary" maxFontSizeMultiplier={cap} onPress={dismiss} />
      </View>
    );
  }

  if (nudge.kind === 'choice' && nudge.choices) {
    return (
      <View style={styles.chips}>
        {nudge.choices.map((c) => (
          <Chip key={c.label} label={c.label} cap={cap} onPress={() => answer(c.sentence)} />
        ))}
        <Chip label="Skip" cap={cap} onPress={dismiss} />
      </View>
    );
  }

  if (nudge.kind === 'yesno' && nudge.yes && nudge.no) {
    if (stage === 'ask') {
      return (
        <View style={styles.chips}>
          <Chip label="Yes" cap={cap} onPress={() => (setPicked('yes'), setStage('more'))} />
          <Chip label="No" cap={cap} onPress={() => (setPicked('no'), setStage('more'))} />
          <Chip label="Skip" cap={cap} onPress={dismiss} />
        </View>
      );
    }
    const side = picked === 'yes' ? nudge.yes : nudge.no;
    return (
      <View style={styles.more}>
        {input(side.askMore)}
        <View style={styles.actions}>
          <PillButton
            label="Save"
            maxFontSizeMultiplier={cap}
            onPress={() => answer(text.trim() ? `${side.sentence} ${text.trim()}` : side.sentence)}
          />
          <PillButton label="Skip" kind="secondary" maxFontSizeMultiplier={cap} onPress={dismiss} />
        </View>
      </View>
    );
  }

  if (nudge.kind === 'text' && nudge.text) {
    const t = nudge.text;
    return (
      <View style={styles.more}>
        {input(t.placeholder, t.numeric)}
        <View style={styles.actions}>
          <PillButton
            label="Save"
            disabled={!text.trim()}
            maxFontSizeMultiplier={cap}
            onPress={() => answer(t.toSentence(text.trim()))}
          />
          <PillButton label="Skip" kind="secondary" maxFontSizeMultiplier={cap} onPress={dismiss} />
        </View>
      </View>
    );
  }
  return null;
}

/** Renders the active nudge, if there is one. */
export function NudgeCard({ capFontScale }: { capFontScale?: boolean }) {
  const id = useOmaltStore((s) => s.activeNudge);
  const nudge = id ? nudgeById(id) : undefined;
  const cap = capFontScale ? fixedSurfaceFontScale : undefined;
  if (!nudge) return null;
  return (
    <Animated.View key={nudge.id} entering={FadeInDown.duration(350)} style={styles.card} accessibilityLiveRegion="polite">
      <AppText variant="small" tone="sage" style={styles.eyebrow} maxFontSizeMultiplier={cap}>
        {nudge.kind === 'notify' ? 'A THOUGHT FROM OMALT' : nudge.kind === 'open' ? 'A REMINDER' : 'QUICK CHECK-IN'}
      </AppText>
      <AppText variant="body" maxFontSizeMultiplier={cap}>
        {nudge.prompt}
      </AppText>
      <NudgeBody nudge={nudge} cap={cap} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ivory,
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  eyebrow: { fontFamily: fonts.bodySemi, letterSpacing: 0.6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  more: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  input: {
    minHeight: hitTarget,
    maxHeight: 96,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
});
