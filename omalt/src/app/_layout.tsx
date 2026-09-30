import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CheerBanner } from '../components/CheerBanner';
import { configureNotificationHandler, listenForNudges } from '../nudges/notifications';
import { useOmaltStore } from '../store/useOmaltStore';
import { colors, fonts, spacing } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const ready = useOmaltStore((s) => s.ready);
  const error = useOmaltStore((s) => s.error);
  const init = useOmaltStore((s) => s.init);
  const syncUnlocks = useOmaltStore((s) => s.syncUnlocks);
  const maybeShowNudge = useOmaltStore((s) => s.maybeShowNudge);
  const showNudge = useOmaltStore((s) => s.showNudge);
  const refreshNudgeSchedule = useOmaltStore((s) => s.refreshNudgeSchedule);

  useEffect(() => {
    init();
  }, [init]);

  // Time-based unlocks: re-check every minute and whenever the app returns to the foreground.
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => syncUnlocks(), 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncUnlocks();
        maybeShowNudge();
        refreshNudgeSchedule();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, syncUnlocks, maybeShowNudge, refreshNudgeSchedule]);

  // Nudges: offer one when the app opens, keep the week's notifications topped up,
  // and react to nudge notifications (received while open, or tapped).
  useEffect(() => {
    if (!ready) return;
    try {
      configureNotificationHandler();
    } catch {
      // Notifications are optional.
    }
    maybeShowNudge();
    refreshNudgeSchedule();
    try {
      return listenForNudges(showNudge);
    } catch {
      return undefined;
    }
  }, [ready, maybeShowNudge, refreshNudgeSchedule, showNudge]);

  const done = (fontsLoaded || !!fontError) && ready;
  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  if (!done) return null;

  if (error) {
    return (
      <View style={styles.error}>
        <AppText variant="title">Something went wrong</AppText>
        <AppText variant="body" tone="soft">
          {error}
        </AppText>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <CheerBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.sageDeep,
            headerTitleStyle: { fontFamily: fonts.heading, color: colors.ink },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="module/[id]" options={{ title: '', headerBackTitle: 'Canvas' }} />
          <Stack.Screen name="thought/[id]" options={{ title: 'Thought', headerBackTitle: 'Back' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  error: { flex: 1, backgroundColor: colors.background, padding: spacing.xxl, justifyContent: 'center', gap: spacing.md },
});
