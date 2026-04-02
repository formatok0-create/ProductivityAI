import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Task } from '../../types';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';
import { CheckButton } from '../ui/CheckButton';
import { PriorityBadge } from '../ui/PriorityBadge';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
}

export function TaskCard({ task, onToggle, onPress, onLongPress, onDelete }: Props) {
  const opacity = useSharedValue(task.completed ? 0.55 : 1);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleToggle = useCallback(() => {
    opacity.value = withTiming(task.completed ? 1 : 0.55, { duration: 250 });
    onToggle();
  }, [onToggle, opacity, task.completed]);

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(40);
    onLongPress?.();
  }, [onLongPress]);

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress ? handleLongPress : undefined} style={styles.wrapper}>
      <Animated.View style={[styles.card, animStyle]}>
        <View style={styles.left}>
          <CheckButton checked={task.completed} onToggle={handleToggle} size={26} />
        </View>

        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              task.completed && styles.strikethrough,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.meta}>
            {task.time ? (
              <View style={styles.timeChip}>
                <MaterialIcons name="access-time" size={11} color={Colors.textSecondary} />
                <Text style={styles.timeText}>{task.time}</Text>
              </View>
            ) : null}
            <PriorityBadge priority={task.priority} />
            {task.xp > 0 ? (
              <View style={styles.xpChip}>
                <Text style={styles.xpText}>+{task.xp} XP</Text>
              </View>
            ) : null}
          </View>
        </View>

        {onDelete ? (
          <PressableScale onPress={onDelete} style={styles.deleteBtn} scaleTo={0.85}>
            <MaterialIcons name="delete-outline" size={20} color={Colors.textTertiary} />
          </PressableScale>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadow.soft,
  },
  left: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    lineHeight: 22,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: Colors.textTertiary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  xpChip: {
    backgroundColor: '#FFFBE0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  xpText: {
    fontSize: FontSize.xs,
    color: '#CC9900',
    fontWeight: FontWeight.bold,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
