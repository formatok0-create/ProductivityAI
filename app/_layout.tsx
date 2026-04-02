import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../contexts/AppContext';
import { AIProvider } from '../contexts/AIContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { SplashAnimation } from '../components/ui/SplashAnimation';

export default function RootLayout() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <AIProvider>
          <AppProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="project/[id]"
                options={{
                  headerShown: true,
                  headerTitle: 'Détail projet',
                  headerBackTitle: 'Retour',
                  headerStyle: { backgroundColor: '#F8F9FA' },
                  headerTintColor: '#1A1A2E',
                  headerShadowVisible: false,
                }}
              />
            </Stack>
            {!splashDone && (
              <SplashAnimation onFinish={() => setSplashDone(true)} />
            )}
          </AppProvider>
        </AIProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
