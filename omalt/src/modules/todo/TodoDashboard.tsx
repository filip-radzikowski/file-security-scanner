import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { PillButton } from '../../components/PillButton';
import { Screen } from '../../components/Screen';
import { useOmaltStore } from '../../store/useOmaltStore';
import { colors, fonts, hairlineWidth, hitTarget, radius, spacing } from '../../theme';
import type { DashboardProps } from '../types';
import { TaskItem, taskStats } from './schema';

function TaskRow({ task, onToggle }: { task: TaskItem; onToggle: () => void }) {
  const source =
    task.source === 'manual' ? 'Added by you' : `From your entry · ${format(task.createdAt, 'EEE d MMM')}`;
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      accessibilityLabel={task.text}
      accessibilityHint={`${source}. Double tap to mark ${task.done ? 'not done' : 'done'}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.box, task.done && styles.boxDone]}>
        {task.done ? (
          <AppText variant="small" tone="onSage" allowFontScaling={false} style={styles.tick}>
            {'✓'}
          </AppText>
        ) : null}
      </View>
      <View style={styles.rowText}>
        <AppText variant="body" tone={task.done ? 'soft' : 'ink'} style={task.done && styles.struck}>
          {task.text}
        </AppText>
        <AppText variant="small" tone="soft">
          {source}
        </AppText>
      </View>
    </Pressable>
  );
}

export function TodoDashboard(_props: DashboardProps) {
  const tasks = useOmaltStore((s) => s.tasks);
  const toggleTask = useOmaltStore((s) => s.toggleTask);
  const addTask = useOmaltStore((s) => s.addTask);
  const [draft, setDraft] = useState('');

  const stats = useMemo(() => taskStats(tasks), [tasks]);
  const open = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  const submit = async () => {
    if (!draft.trim()) return;
    await addTask(draft);
    setDraft('');
  };

  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          PROGRESS
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {stats.total === 0 ? 'No tasks yet' : `${stats.done} of ${stats.total} done`}
        </AppText>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Task progress"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(stats.progress * 100) }}
        >
          <View style={[styles.fill, { width: `${Math.round(stats.progress * 100)}%` }]} />
        </View>
        <AppText variant="small" tone="soft">
          {stats.open === 0 && stats.total > 0
            ? 'All clear. Nicely done.'
            : `${stats.open} still open. Tasks you mention while writing show up here automatically.`}
        </AppText>
      </Panel>

      <Panel>
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            returnKeyType="done"
            placeholder="Add a task"
            placeholderTextColor={colors.inkSoft}
            accessibilityLabel="New task"
            style={styles.input}
            selectionColor={colors.sage}
            maxLength={200}
          />
          <PillButton label="Add" onPress={submit} disabled={!draft.trim()} accessibilityLabel="Add task" />
        </View>
      </Panel>

      {open.length > 0 ? (
        <Panel>
          <AppText variant="label" tone="soft">
            OPEN
          </AppText>
          {open.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
          ))}
        </Panel>
      ) : null}

      {done.length > 0 ? (
        <Panel>
          <AppText variant="label" tone="soft">
            DONE
          </AppText>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
          ))}
        </Panel>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sandSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.sage },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  input: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: hitTarget,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  rowPressed: { backgroundColor: colors.ivoryPressed },
  rowText: { flex: 1 },
  box: {
    width: 26,
    height: 26,
    marginTop: 1,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: { backgroundColor: colors.sage },
  tick: { fontSize: 14, lineHeight: 16 },
  struck: { textDecorationLine: 'line-through' },
});
