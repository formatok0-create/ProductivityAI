import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { CircularTabBar } from '../../components/ui/CircularTabBar';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="tasks" />
        <Tabs.Screen name="routines" />
        <Tabs.Screen name="projects" />
        <Tabs.Screen name="calendar" />
        <Tabs.Screen name="stats" />
        <Tabs.Screen name="settings" />
      </Tabs>

      {/* Floating circular navigation */}
      <CircularTabBar />
    </View>
  );
}
