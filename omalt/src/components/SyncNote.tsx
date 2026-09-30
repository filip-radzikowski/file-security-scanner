import { format } from 'date-fns';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SOURCE_LABELS } from '../health';
import { useOmaltStore } from '../store/useOmaltStore';
import { spacing } from '../theme';
import { AppText } from './AppText';

/** One line on a tracker dashboard saying where its numbers come from, with a way to connect a source. */
export function SyncNote({ metric }: { metric: 'steps' | 'sleep' | 'heart' }) {
  const source = useOmaltStore((s) => s.healthSource);
  const syncedAt = useOmaltStore((s) => s.healthSyncedAt);
  const words = metric === 'steps' ? 'steps' : metric === 'sleep' ? 'sleep' : 'heart rate';

  if (source) {
    return (
      <AppText variant="small" tone="sage" style={styles.note}>
        Synced from {SOURCE_LABELS[source]}
        {source === 'demo' ? ' (simulated)' : ''}
        {syncedAt ? ` · ${format(syncedAt, 'HH:mm')}` : ''}
      </AppText>
    );
  }
  return (
    <Pressable
      onPress={() => router.push('/health')}
      accessibilityRole="button"
      accessibilityLabel={`Connect Apple Health or a device for ${words}`}
      style={styles.note}
    >
      <AppText variant="small" tone="sage">
        Entered by you. Connect Apple Health or a device {'›'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({ note: { marginBottom: spacing.xs } });
