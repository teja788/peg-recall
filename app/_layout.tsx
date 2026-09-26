import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSettings } from '../src/store/settings';
import { useStats } from '../src/store/stats';
import { DARK, LIGHT, ThemeProvider } from '../src/theme';

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrate = useSettings((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    // per-name win stats: read once at launch, alongside the settings
    void useStats.getState().hydrate();
  }, [hydrate]);

  // the colour behind the screens during a transition — matching the table
  // backdrop keeps a cream flash from showing between Home and Game
  const page = scheme === 'dark' ? DARK.backdropBottom : LIGHT.backdropBottom;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* every screen sits on the teal table backdrop, in both schemes,
              so the bar is always light — `auto` goes black in light mode */}
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: page },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="game" />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="how-to-play" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
