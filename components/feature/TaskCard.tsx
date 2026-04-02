import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Task } from '../../types';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';
import { CheckButton } from '../ui/CheckButton';
import { PriorityBadge } from '../ui/PriorityBadge';
import { MaterialIcons } from '@expo/vector-icons';
import { useTaskTimer, formatDuration } from '../../hooks/useTaskTimer';

interface Props {
  task: Task;
  onToggle: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onTimerToggle?: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onPress, onLongPress, onDelete, onTimerToggle }: Props) {
  const opacity = useSharedValue(task.completed ? 0.55 : 1);
  const { elapsed, running } = useTaskTimer(task);

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

  const handleTimerPress = useCallback(() => {
    onTimerToggle?.(task);
  }, [task, onTimerToggle]);

  const hasTime = elapsed > 0 || running;

  return (
    <PressableScale onPress={onPress} onLongPress={onLongPress ? handleLongPress : undefined} style={styles.wrapper}>
      <Animated.View style={[styles.card, animStyle]}>
        {/* Left: checkbox */}
        <View style={styles.left}>
          <CheckButton checked={task.completed} onToggle={handleToggle} size={26} />
        </View>

        {/* Middle: content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, task.completed && styles.strikethrough]}
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

          {/* Chrono display */}
          {hasTime ? (
            <View style={[styles.chronoRow, running && styles.chronoRowActive]}>
              <MaterialIcons
                name="timer"
                size={12}
                color={running ? Colors.primary : Colors.textTertiary}
              />
              <Text style={[styles.chronoText, running && styles.chronoTextActive]}>
                {formatDuration(elapsed)}
              </Text>
              {running && <View style={styles.liveDot} />}
            </View>
          ) : null}
        </View>

        {/* Right: timer button + delete */}
        <View style={styles.actions}>
          {onTimerToggle && !task.completed ? (
            <PressableScale
              onPress={handleTimerPress}
              scaleTo={0.82}
              style={[styles.timerBtn, running && styles.timerBtnActive]}
            >
              <MaterialIcons
                name={running ? 'pause' : 'play-arrow'}
                size={18}
                color={running ? '#fff' : Colors.primary}
              />
            </PressableScale>
          ) : null}

          {onDelete ? (
            <PressableScale onPress={onDelete} style={styles.deleteBtn} scaleTo={0.85}>
              <MaterialIcons name="delete-outline" size={20} color={Colors.textTertiary} />
            </PressableScale>
          ) : null}
        </View>
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
  chronoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  chronoRowActive: {
    backgroundColor: Colors.primaryLight,
  },
  chronoText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  chronoTextActive: {
    color: Colors.primaryDark,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  actions: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary + '40',
  },
  timerBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },
});
