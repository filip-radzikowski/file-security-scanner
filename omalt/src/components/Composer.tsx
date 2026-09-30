import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { moodLabel } from '../modules/mood/schema';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fixedSurfaceFontScale, fonts, hairlineWidth, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';

interface Props {
  height: number;
}

/** The one text box: "What's on your mind?" with a sage send arrow. */
export function Composer({ height }: Props) {
  const addEntry = useOmaltStore((s) => s.addEntry);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const canSend = text.trim().length > 0 && !busy;

  const submit = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const result = await addEntry(text);
      if (result) {
        setText('');
        Keyboard.dismiss();
        const parts = ['Saved.'];
        if (result.taskCount > 0) parts.push(`${result.taskCount} task${result.taskCount === 1 ? '' : 's'} noticed.`);
        if (result.mood !== null) parts.push(`Feeling ${moodLabel(result.mood).toLowerCase()}.`);
        setNote(parts.join(' '));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setNote(''), 4000);
      }
    } catch {
      setNote('Could not save that. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [text, busy, addEntry]);

  return (
    <View style={[styles.box, { height }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.inkSoft}
        multiline
        style={styles.input}
        maxFontSizeMultiplier={fixedSurfaceFontScale}
        accessibilityLabel="Write an entry"
        accessibilityHint="Write what is on your mind, then use the send button"
        selectionColor={colors.sage}
        textAlignVertical="top"
        maxLength={4000}
      />
      <View style={styles.row}>
        <AppText
          variant="small"
          tone="soft"
          numberOfLines={1}
          style={styles.note}
          maxFontSizeMultiplier={fixedSurfaceFontScale}
          accessibilityLiveRegion="polite"
        >
          {note}
        </AppText>
        <Pressable
          onPress={submit}
          disabled={!canSend}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Send entry"
          accessibilityState={{ disabled: !canSend }}
          style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && styles.sendPressed]}
        >
          <AppText variant="button" tone="onSage" style={styles.arrow} allowFontScaling={false}>
            {'→'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.xl - 4,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.card,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 24,
    color: colors.ink,
    padding: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  note: { flex: 1, marginRight: spacing.md },
  send: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
  sendPressed: { opacity: 0.8 },
  arrow: { fontSize: 20, lineHeight: 24 },
});
