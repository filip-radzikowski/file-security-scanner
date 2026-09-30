import { format, formatDistanceToNow } from 'date-fns';
import { AppText } from '../../components/AppText';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import type { DashboardProps } from '../types';

/** Placeholder for module types that don't have their own dashboard yet. */
export function GenericDashboard({ module }: DashboardProps) {
  return (
    <Screen>
      <Panel>
        <AppText variant="label" tone="sage">
          MODULE
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {module.title}
        </AppText>
        <AppText variant="body" tone="soft">
          This dashboard is still a blank page. It will fill in as Omalt learns what this module is for.
        </AppText>
      </Panel>
      <Panel>
        <AppText variant="small" tone="soft">
          Type: {module.type}
        </AppText>
        <AppText variant="small" tone="soft">
          Added {format(module.addedAt, 'EEE d MMM, HH:mm')}
        </AppText>
        <AppText variant="small" tone="soft">
          Last opened {formatDistanceToNow(module.lastUsedAt, { addSuffix: true })}
        </AppText>
      </Panel>
    </Screen>
  );
}
