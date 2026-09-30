import { format } from 'date-fns';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { useUnlockProgress } from '../unlocks/useUnlockProgress';
import type { ModuleData } from '../modules/types';
import type { ModuleRecord } from '../db/schema';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getModuleDefinition } from '../modules/registry';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, hairlineWidth, hitTarget, radius, shadows, spacing } from '../theme';
import { AppText } from './AppText';
import { Composer } from './Composer';
import { GrowthHint } from './GrowthHint';
import { SuggestionPrompt } from './SuggestionPrompt';

function ModuleRow({ module: m, data }: { module: ModuleRecord; data: ModuleData }) {
  const locked = m.status === 'locked';
  const unlock = useUnlockProgress(locked ? m.type : '');
  const def = getModuleDefinition(m.type);
  const summary = locked ? `Locked \u00B7 ${unlock?.progress.remainingLabel ?? ''}` : def.summarize(data);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/module/[id]', params: { id: m.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${m.title}. ${summary}`}
      accessibilityHint={locked ? 'Shows what unlocks it' : 'Opens the full dashboard'}
      style={({ pressed }) => [styles.row, locked && styles.rowLocked, pressed && styles.pillPressed]}
    >
      <View style={styles.rowText}>
        <AppText variant="heading" tone={locked ? 'soft' : 'ink'}>
          {m.title}
        </AppText>
        <AppText variant="small" tone="soft">
          {summary}
        </AppText>
      </View>
      <AppText variant="heading" tone="soft" allowFontScaling={false}>
        {'\u203A'}
      </AppText>
    </Pressable>
  );
}

/** Plain, linear alternative to the canvas (Settings > Plain list view). */
export function ListView() {
  const insets = useSafeAreaInsets();
  const modules = useOmaltStore((s) => s.modules);
  const tasks = useOmaltStore((s) => s.tasks);
  const moods = useOmaltStore((s) => s.moods);
  const entries = useOmaltStore((s) => s.entries);
  const items = useOmaltStore((s) => s.items);
  const recent = useMemo(() => entries.slice(-5).reverse(), [entries]);
  const data = useMemo(() => ({ tasks, moods, entries, items }), [tasks, moods, entries, items]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.top}>
        <View>
          <AppText variant="wordmark" accessibilityRole="header">
            Omalt
          </AppText>
          <AppText variant="small" tone="soft">
            Start blank. Become yours.
          </AppText>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <AppText variant="button">Settings</AppText>
        </Pressable>
      </View>

      <Composer height={150} />
      <SuggestionPrompt />
      <GrowthHint bare />

      <AppText variant="label" tone="soft" style={styles.sectionLabel}>
        YOUR MODULES
      </AppText>
      {modules.length === 0 ? (
        <AppText variant="body" tone="soft">
          Nothing here yet. Keep writing, and Omalt will suggest what to add.
        </AppText>
      ) : (
        modules.map((m) => <ModuleRow key={m.id} module={m} data={data} />)
      )}

      {recent.length > 0 ? (
        <>
          <AppText variant="label" tone="soft" style={styles.sectionLabel}>
            RECENT THOUGHTS (TAP ONE TO OPEN)
          </AppText>
          {recent.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push({ pathname: '/thought/[id]', params: { id: e.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Your entry: ${e.text}`}
              accessibilityHint="Opens this thought"
              style={({ pressed }) => [styles.thought, pressed && styles.pillPressed]}
            >
              <AppText variant="body" numberOfLines={3}>
                {e.text}
              </AppText>
              <AppText variant="small" tone="soft">
                {format(e.createdAt, 'd MMM \u00B7 HH:mm')} {'\u00B7'} tap to open
              </AppText>
            </Pressable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  sectionLabel: { marginTop: spacing.md },
  pill: {
    minHeight: hitTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillPressed: { backgroundColor: colors.ivoryPressed },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.ivory,
    borderRadius: radius.md,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
    ...shadows.card,
  },
  rowLocked: { backgroundColor: colors.sandSoft, borderStyle: 'dashed' },
  rowText: { flex: 1 },
  thought: {
    padding: spacing.lg,
    gap: 2,
    borderRadius: radius.md,
    backgroundColor: colors.sandSoft,
    borderWidth: hairlineWidth,
    borderColor: colors.hairline,
  },
});
