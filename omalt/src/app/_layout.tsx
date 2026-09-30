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

  useEffect(() => {
    init();
  }, [init]);

  // Time-based unlocks: re-check every minute and whenever the app returns to the foreground.
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => syncUnlocks(), 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncUnlocks();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, syncUnlocks]);

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
