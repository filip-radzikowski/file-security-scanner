import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { getModuleDefinition } from '../../modules/registry';
import { LockedDashboard } from '../../unlocks/LockedDashboard';
import { useOmaltStore } from '../../store/useOmaltStore';

export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const module = useOmaltStore((s) => s.modules.find((m) => m.id === id));
  const markUsed = useOmaltStore((s) => s.markModuleUsed);

  useEffect(() => {
    if (id && module) markUsed(id);
    // Only when the screen opens for this module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, !!module]);

  useEffect(() => {
    if (!module && router.canGoBack()) router.back();
  }, [module]);

  if (!module) return null;
  const Dashboard = module.status === 'locked' ? LockedDashboard : getModuleDefinition(module.type).Dashboard;
  return (
    <>
      <Stack.Screen options={{ title: module.title }} />
      <Dashboard module={module} />
    </>
  );
}
