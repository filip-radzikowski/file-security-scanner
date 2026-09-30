import { format } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Reflection, aiService } from '../../ai';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { moodLabel } from '../../modules/mood/schema';
import { conditionLabel, weatherPayloadSchema } from '../../modules/weather/schema';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, fonts, hairlineWidth, radius, spacing } from '../../theme';
import { formatHours, sleepPayloadSchema } from '../../modules/sleep/schema';
import { stepsPayloadSchema } from '../../modules/steps/schema';
import { parseTaskPayload } from '../../modules/todo/schema';

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="small" tone="sage">
        {label}
      </AppText>
    </View>
  );
}

function parse<T>(schema: { safeParse(v: unknown): { success: boolean; data?: T } }, json: string): T | null {
  try {
    const r = schema.safeParse(JSON.parse(json));
    return r.success ? (r.data as T) : null;
  } catch {
    return null;
  }
}

/** A single thought, opened up: what Omalt noticed, a kind reflection, and room to say more. */
export default function ThoughtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = useOmaltStore((s) => s.entries.find((e) => e.id === id));
  const items = useOmaltStore((s) => s.items);
  const addFollowUp = useOmaltStore((s) => s.addFollowUp);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!entry) {
      if (router.canGoBack()) router.back();
      return;
    }
    let live = true;
    aiService.reflectOnEntry(entry.text).then((r) => live && setReflection(r));
    return () => {
      live = false;
    };
  }, [entry?.id, entry?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = useMemo(() => items.filter((i) => i.entryId === id), [items, id]);
  const chips = useMemo(() => {
    const out: string[] = [];
    const tasks = mine.filter((i) => i.type === 'task').map((i) => parseTaskPayload(i.payload)).filter(Boolean);
    if (tasks.length) out.push(`${tasks.length} task${tasks.length === 1 ? '' : 's'} noticed`);
    if (entry?.mood != null) out.push(`Feeling ${moodLabel(entry.mood).toLowerCase()} (${entry.mood})`);
    for (const i of mine) {
      if (i.type === 'weather') {
        const w = parse<{ condition?: string }>(weatherPayloadSchema, i.payload);
        out.push(w?.condition ? `Weather: ${conditionLabel(w.condition)}` : 'Weather');
      } else if (i.type === 'sleep') {
        const p = parse<{ hours?: number }>(sleepPayloadSchema, i.payload);
        out.push(p?.hours ? `Sleep: ${formatHours(p.hours)}` : 'Sleep');
      } else if (i.type === 'steps') {
        const p = parse<{ count?: number }>(stepsPayloadSchema, i.payload);
        out.push(p?.count ? `${p.count.toLocaleString()} steps` : 'Walking');
      }
    }
    return out;
  }, [mine, entry?.mood]);

  const followUps = useMemo(() => {
    const out: { id: string; text: string; at: number }[] = [];
    for (const i of mine) {
      if (i.type !== 'followup') continue;
      try {
        const p = JSON.parse(i.payload) as { text?: string; at?: number };
        if (typeof p.text === 'string') out.push({ id: i.id, text: p.text, at: p.at ?? 0 });
      } catch {
        // ignore
      }
    }
    return out.sort((a, b) => b.at - a.at);
  }, [mine]);

  if (!entry) return null;

  const submit = async () => {
    if (!draft.trim()) return;
    await addFollowUp(entry.id, draft);
    setDraft('');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Thought', headerBackTitle: 'Canvas' }} />
      <Panel>
        <AppText variant="label" tone="soft">
          {format(entry.createdAt, 'EEEE d MMMM · HH:mm').toUpperCase()}
        </AppText>
        <AppText variant="body" style={styles.entryText} accessibilityRole="header">
          {entry.text}
        </AppText>
        {chips.length > 0 ? (
          <View style={styles.chips}>
            {chips.map((c, i) => (
              <Chip key={`${c}-${i}`} label={c} />
            ))}
          </View>
        ) : null}
      </Panel>

      {reflection ? (
        <Panel>
          <AppText variant="label" tone="sage">
            OMALT SAYS
          </AppText>
          <AppText variant="body">{reflection.reflection}</AppText>
        </Panel>
      ) : null}

      <Panel>
        <AppText variant="label" tone="soft">
          GO DEEPER
        </AppText>
        <AppText variant="heading">{reflection?.followUpPrompt ?? 'Want to say more about it?'}</AppText>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a little more…"
          placeholderTextColor={colors.inkSoft}
          multiline
          accessibilityLabel="Add to this thought"
          selectionColor={colors.sage}
          style={styles.input}
        />
        <PillButton label="Add" onPress={submit} disabled={!draft.trim()} style={styles.add} accessibilityLabel="Add to this thought" />
        {followUps.map((f) => (
          <View key={f.id} style={styles.followUp}>
            <AppText variant="body">{f.text}</AppText>
            <AppText variant="small" tone="soft">
              {format(f.at, 'd MMM · HH:mm')}
            </AppText>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  entryText: { fontSize: 19, lineHeight: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.sageSoft,
  },
  input: {
    minHeight: 96,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
    padding: spacing.lg,
    textAlignVertical: 'top',
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
  add: { alignSelf: 'flex-start' },
  followUp: {
    gap: 2,
    paddingTop: spacing.md,
    borderTopWidth: hairlineWidth,
    borderTopColor: colors.hairline,
  },
});
