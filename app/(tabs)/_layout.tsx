import { Tabs } from 'expo-router';
import { View, StyleSheet, Pressable } from 'react-native';
import { CircularTabBar } from '../../components/ui/CircularTabBar';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import { useAI } from '../../contexts/AIContext';
import { AIModal } from '../../components/ui/AIModal';
import { useApp } from '../../contexts/AppContext';
import { AIParseResult, Task, Routine, Project } from '../../types';
import { Colors, Shadow } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback } from 'react';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { aiModalVisible, setAiModalVisible } = useAI();
  const { addTask, addRoutine, addProject } = useApp();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const handleAIResult = useCallback(async (result: AIParseResult) => {
    const id = `${result.type}-${Date.now()}`;
    const now = new Date().toISOString();
    if (result.type === 'task') {
      await addTask({ id, title: result.title, date: result.date, time: result.time, completed: false, priority: 'medium', createdAt: now, xp: 20 });
    } else if (result.type === 'routine') {
      const r: Routine = { id, title: result.title, time: result.time, repeat: result.repeat ?? 'daily', completed: false, streak: 0, color: Colors.purple, icon: 'default', createdAt: now, xp: 25 };
      await addRoutine(r);
    } else if (result.type === 'project') {
      const taskIds: string[] = [];
      const p: Project = { id, title: result.title, color: Colors.primary, createdAt: now, taskIds, xp: 100 };
      await addProject(p);
      if (result.subtasks) {
        for (const sub of result.subtasks) {
          const tid = `task-${Date.now()}-${Math.random()}`;
          await addTask({ id: tid, title: sub, completed: false, priority: 'medium', projectId: id, createdAt: now, xp: 15 });
          taskIds.push(tid);
        }
      }
    }
  }, [addTask, addRoutine, addProject]);

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

      {/* Global Mic FAB — bottom right */}
      <View style={[styles.micFabContainer, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
        <Animated.View style={pulseStyle}>
          <Pressable
            onPress={() => setAiModalVisible(true)}
            style={({ pressed }) => [styles.micFab, pressed && { opacity: 0.82 }]}
            android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 26 }}
          >
            <MaterialIcons name="mic" size={26} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>

      {/* Global AI Modal */}
      <AIModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onResult={handleAIResult}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  micFabContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 99,
  },
  micFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.3)',
    ...Shadow.medium,
  },
});
