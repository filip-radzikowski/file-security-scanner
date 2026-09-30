import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Panel } from '../components/Panel';
import { Screen } from '../components/Screen';
import type { DashboardProps } from '../modules/types';
import { colors } from '../theme';
import { useUnlockProgress } from './useUnlockProgress';

/** Full screen for a locked module: what it is, what unlocks it, and how long is left. */
export function LockedDashboard({ module }: DashboardProps) {
  const unlock = useUnlockProgress(module.type);
  const pct = Math.round((unlock?.progress.fraction ?? 0) * 100);
  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sand">
          LOCKED
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {module.title}
        </AppText>
        <AppText variant="body" tone="soft">
          {unlock?.rule.teaser ?? 'This module is still locked.'}
        </AppText>
      </Panel>

      <Panel>
        <AppText variant="label" tone="sage">
          TIME LEFT
        </AppText>
        <AppText variant="display" accessibilityLiveRegion="polite">
          {unlock?.progress.remainingLabel ?? ''}
        </AppText>
        <View
          style={styles.track}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Unlock progress"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
        >
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <AppText variant="small" tone="soft">
          {pct}% of the way there
        </AppText>
        {unlock?.progress.unlockAt ? (
          <AppText variant="small" tone="soft">
            Opens {format(unlock.progress.unlockAt, 'EEE d MMM, HH:mm')}
          </AppText>
        ) : null}
      </Panel>

      <Panel>
        <AppText variant="label" tone="soft">
          HOW TO UNLOCK
        </AppText>
        <AppText variant="body">{unlock?.rule.requirement}</AppText>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.sandSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.sage },
});
