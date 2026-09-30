import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Omalt',
  slug: 'omalt',
  scheme: 'omalt',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#FAF8F5',
  ios: {
    // Placeholder identifier - replace before building with EAS.
    bundleIdentifier: 'com.example.omalt',
    supportsTablet: true,
  },
  android: {
    // Placeholder package name - replace before building with EAS.
    package: 'com.example.omalt',
    adaptiveIcon: {
      backgroundColor: '#FAF8F5',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#FAF8F5',
      },
    ],
    'expo-sqlite',
  ],
};

export default config;
