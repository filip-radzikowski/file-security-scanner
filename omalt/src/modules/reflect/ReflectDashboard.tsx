import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { useNow } from '../../lib/useNow';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, fonts, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import { FeelingSlider } from '../mood/FeelingSlider';
import { moodLabel } from '../mood/schema';
import type { DashboardProps } from '../types';
import { PROMPT_THEMES, promptPool, weekSeed } from './prompts';
import { deriveReflections, reflectedThisWeek, weekSummary, weeksInARow } from './schema';

const WORD = /\S+/g;

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.75 }]}
    >
      <AppText variant="button" tone={on ? 'onSage' : 'ink'}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function ReflectDashboard(_props: DashboardProps) {
  const entries = useOmaltStore((s) => s.entries);
  const items = useOmaltStore((s) => s.items);
  const tasks = useOmaltStore((s) => s.tasks);
  const prefs = useOmaltStore((s) => s.reflectPrefs);
  const setPrefs = useOmaltStore((s) => s.setReflectPrefs);
  const addReflection = useOmaltStore((s) => s.addReflection);
  const now = useNow(60000);
  const today = new Date(now);

  const reflections = useMemo(() => deriveReflections(items, entries), [items, entries]);
  const streak = weeksInARow(reflections, today);
  const doneThisWeek = reflectedThisWeek(reflections, today);
  const week = useMemo(() => weekSummary(entries, tasks, now), [entries, tasks, now]);

  // ---- write a reflection ----
  const pool = useMemo(() => promptPool(prefs), [prefs]);
  const [shift, setShift] = useState(0);
  const prompt = pool[(weekSeed(today) + shift) % pool.length];
  const [text, setText] = useState('');
  const [rate, setRate] = useState(false);
  const rating = useRef(60);
  const [saved, setSaved] = useState(false);
  const words = (text.match(WORD) ?? []).length;

  const save = async () => {
    const id = await addReflection({ prompt, text, rating: rate ? rating.current : undefined });
    if (id) {
      setText('');
      setRate(false);
      setSaved(true);
      setShift((s) => s + 1);
    }
  };

  // ---- make it yours ----
  const [customise, setCustomise] = useState(false);
  const [custom, setCustom] = useState('');
  const toggleTheme = (id: string) => {
    const on = prefs.themes.includes(id);
    const themes = on ? prefs.themes.filter((t) => t !== id) : [...prefs.themes, id];
    // Keep at least one source of prompts.
    if (themes.length === 0 && prefs.custom.length === 0) return;
    setPrefs({ ...prefs, themes });
    setShift(0);
  };
  const addCustom = () => {
    const value = custom.trim();
    if (!value || prefs.custom.length >= 12) return;
    setPrefs({ ...prefs, custom: [value, ...prefs.custom] });
    setCustom('');
    setShift(0);
  };
  const removeCustom = (p: string) => {
    const next = prefs.custom.filter((c) => c !== p);
    if (prefs.themes.length === 0 && next.length === 0) return;
    setPrefs({ ...prefs, custom: next });
    setShift(0);
  };

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          REFLECT
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {doneThisWeek ? 'You have reflected this week' : 'A few minutes for yourself'}
        </AppText>
        <AppText variant="small" tone="soft">
          {streak >= 2
            ? `${streak} weeks in a row. `
            : streak === 1
              ? 'One week so far. '
              : ''}
          {reflections.length === 0
            ? 'Write your first reflection below. There are no wrong answers.'
            : `${reflections.length} reflection${reflections.length === 1 ? '' : 's'} saved.`}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          YOUR PROMPT
        </AppText>
        <AppText variant="heading" accessibilityRole="header">
          {prompt}
        </AppText>
        <View style={styles.row}>
          {pool.length > 1 ? (
            <PillButton label="Another prompt" kind="ghost" onPress={() => setShift((s) => s + 1)} />
          ) : null}
        </View>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            setSaved(false);
          }}
          placeholder="Write as much or as little as you like…"
          placeholderTextColor={colors.inkSoft}
          multiline
          accessibilityLabel={`Your reflection. ${prompt}`}
          selectionColor={colors.sage}
          style={styles.input}
        />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <AppText variant="bodyStrong">Rate this week</AppText>
            <AppText variant="small" tone="soft">
              Optional: how was it overall, from 0 to 100?
            </AppText>
          </View>
          <Switch
            value={rate}
            onValueChange={setRate}
            trackColor={{ false: colors.sand, true: colors.sage }}
            thumbColor={colors.ivory}
            accessibilityLabel="Rate this week"
          />
        </View>
        {rate ? (
          <FeelingSlider
            initial={rating.current}
            onChange={(v) => {
              rating.current = v;
            }}
            label="How was this week overall, from 0 to 100"
            ends={['0 · Rough', '50', 'Great · 100']}
            wordFor={moodLabel}
          />
        ) : null}
        <View style={styles.saveRow}>
          <PillButton label="Save reflection" onPress={save} disabled={!text.trim()} />
          <AppText variant="small" tone="soft" accessibilityLiveRegion="polite">
            {saved ? 'Saved. It is in your timeline below.' : words > 0 ? `${words} word${words === 1 ? '' : 's'}` : ''}
          </AppText>
        </View>
      </Panel>

      <Panel>
        <Pressable
          onPress={() => setCustomise((c) => !c)}
          accessibilityRole="button"
          accessibilityState={{ expanded: customise }}
          accessibilityLabel="Make it yours"
          accessibilityHint="Choose the themes and prompts you want"
          style={styles.headerRow}
        >
          <View style={styles.switchText}>
            <AppText variant="label" tone="soft">
              MAKE IT YOURS
            </AppText>
            <AppText variant="small" tone="soft">
              {customise ? 'Choose what you want to be asked about.' : `${prefs.themes.length} theme${prefs.themes.length === 1 ? '' : 's'}${prefs.custom.length ? `, ${prefs.custom.length} of your own` : ''}`}
            </AppText>
          </View>
          <AppText variant="heading" tone="soft" allowFontScaling={false}>
            {customise ? '⌃' : '⌄'}
          </AppText>
        </Pressable>

        {customise ? (
          <>
            <AppText variant="label" tone="soft">
              THEMES
            </AppText>
            <View style={styles.chips}>
              {PROMPT_THEMES.map((t) => (
                <Chip key={t.id} label={t.label} on={prefs.themes.includes(t.id)} onPress={() => toggleTheme(t.id)} />
              ))}
            </View>

            <AppText variant="label" tone="soft" style={styles.gap}>
              YOUR OWN PROMPTS
            </AppText>
            <View style={styles.addRow}>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                onSubmitEditing={addCustom}
                returnKeyType="done"
                placeholder="e.g. What made me smile?"
                placeholderTextColor={colors.inkSoft}
                accessibilityLabel="Write your own prompt"
                selectionColor={colors.sage}
                maxLength={200}
                style={styles.promptInput}
              />
              <PillButton label="Add" onPress={addCustom} disabled={!custom.trim()} accessibilityLabel="Add prompt" />
            </View>
            {prefs.custom.map((p) => (
              <View key={p} style={styles.customRow}>
                <AppText variant="body" style={styles.customText}>
                  {p}
                </AppText>
                <Pressable
                  onPress={() => removeCustom(p)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove prompt: ${p}`}
                  style={styles.remove}
                >
                  <AppText variant="small" tone="soft">
                    Remove
                  </AppText>
                </Pressable>
              </View>
            ))}
            <AppText variant="small" tone="soft">
              Your own prompts come up first. With no themes selected, only your prompts are used.
            </AppText>
          </>
        ) : null}
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          YOUR REFLECTIONS
        </AppText>
        {reflections.length === 0 ? (
          <AppText variant="body" tone="soft">
            Nothing here yet. What you save above shows up here, newest first.
          </AppText>
        ) : (
          reflections.slice(0, 8).map((r) => (
            <Pressable
              key={r.entryId}
              onPress={() => router.push({ pathname: '/thought/[id]', params: { id: r.entryId } })}
              accessibilityRole="button"
              accessibilityLabel={`Reflection from ${format(r.createdAt, 'd MMMM')}. ${r.prompt} ${r.text}`}
              accessibilityHint="Opens this reflection"
              style={({ pressed }) => [styles.past, pressed && { backgroundColor: colors.ivoryPressed }]}
            >
              <View style={styles.pastHead}>
                <AppText variant="small" tone="soft">
                  {format(r.createdAt, 'EEE d MMM')}
                </AppText>
                {r.rating !== undefined ? (
                  <View style={styles.badge}>
                    <AppText variant="small" tone="sage">
                      Week {Math.round(r.rating)} · {moodLabel(r.rating)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText variant="small" tone="soft" numberOfLines={2}>
                {r.prompt}
              </AppText>
              <AppText variant="body" numberOfLines={3}>
                {r.text}
              </AppText>
            </Pressable>
          ))
        )}
      </Panel>

      <AppText variant="label" tone="soft" style={styles.section}>
        THIS WEEK AT A GLANCE
      </AppText>

      <Panel>
        <AppText variant="display" accessibilityRole="header">
          {week.entryCount} {week.entryCount === 1 ? 'entry' : 'entries'}
        </AppText>
        <AppText variant="small" tone="soft">
          You showed up on {week.activeDays} of the last 7 days.
        </AppText>
        <View style={styles.days}>
          {week.days.map((d) => (
            <View
              key={d.date.getTime()}
              style={styles.day}
              accessible
              accessibilityLabel={`${d.label}: ${d.hasEntry ? 'wrote' : 'no entry'}`}
            >
              <View style={[styles.dot, d.hasEntry && styles.dotOn, d.isToday && styles.dotToday]} />
              <AppText variant="small" tone={d.isToday ? 'ink' : 'soft'}>
                {d.label}
              </AppText>
            </View>
          ))}
        </View>
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          FEELING
        </AppText>
        <AppText variant="heading">
          {week.moodAverage === null
            ? 'No mood written about this week'
            : `Mostly ${moodLabel(week.moodAverage).toLowerCase()} (${Math.round(week.moodAverage)} out of 100)`}
        </AppText>
        <AppText variant="label" tone="soft" style={styles.gap}>
          GOT DONE
        </AppText>
        <AppText variant="heading">
          {week.tasksDone} {week.tasksDone === 1 ? 'task' : 'tasks'} ticked off
        </AppText>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    minHeight: 150,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
    padding: spacing.lg,
    textAlignVertical: 'top',
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  switchText: { flex: 1, gap: 2 },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hitTarget },
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
  chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  gap: { marginTop: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promptInput: {
    flex: 1,
    minHeight: hitTarget,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: hitTarget },
  customText: { flex: 1 },
  remove: { minHeight: hitTarget, minWidth: hitTarget, alignItems: 'center', justifyContent: 'center' },
  past: {
    gap: 4,
    paddingVertical: spacing.md,
    borderTopWidth: hairlineWidth,
    borderTopColor: colors.hairline,
  },
  pastHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.sageSoft },
  section: { marginTop: spacing.md },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  day: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sandSoft },
  dotOn: { backgroundColor: colors.sage },
  dotToday: { borderWidth: 2, borderColor: colors.sageDeep },
});
