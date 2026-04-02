import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Routine } from '../../types';
import { Colors, FontSize, FontWeight, Radii, Shadow, Spacing } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';
import { CheckButton } from '../ui/CheckButton';
import { RepeatBadge } from '../ui/RepeatBadge';
import { MaterialIcons } from '@expo/vector-icons';

const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  meditation: 'self-improvement',
  sport: 'fitness-center',
  reading: 'menu-book',
  default: 'loop',
};

interface Props {
  routine: Routine;
  onToggle: () => void;
  onDelete?: () => void;
  onLongPress?: () => void;
}

export function RoutineCard({ routine, onToggle, onDelete, onLongPress }: Props) {
  const opacity = useSharedValue(routine.completed ? 0.55 : 1);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLongPress = useCallback(() => {
    Vibration.vibrate(40);
    onLongPress?.();
  }, [onLongPress]);

  const handleToggle = () => {
    opacity.value = withTiming(routine.completed ? 1 : 0.55, { duration: 250 });
    onToggle();
  };

  const iconName = ICON_MAP[routine.icon] ?? ICON_MAP.default;

  return (
    <PressableScale style={styles.wrapper} onLongPress={onLongPress ? handleLongPress : undefined}>
      <Animated.View style={[styles.card, animStyle]}>
        {/* Colored icon blob */}
        <View style={[styles.iconBlob, { backgroundColor: routine.color + '22' }]}>
          <MaterialIcons name={iconName} size={22} color={routine.color} />
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.title, routine.completed && styles.strikethrough]}
            numberOfLines={1}
          >
            {routine.title}
          </Text>

          <View style={styles.meta}>
            {routine.time ? (
              <View style={styles.timeChip}>
                <MaterialIcons name="access-time" size={11} color={Colors.textSecondary} />
                <Text style={styles.timeText}>{routine.time}</Text>
              </View>
            ) : null}
            <RepeatBadge repeat={routine.repeat} />
            {routine.streak > 0 ? (
              <View style={styles.streakChip}>
                <Text style={styles.streakText}>🔥 {routine.streak}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          <CheckButton checked={routine.completed} onToggle={handleToggle} size={26} />
          {onDelete ? (
            <PressableScale onPress={onDelete} scaleTo={0.85} style={styles.deleteBtn}>
              <MaterialIcons name="delete-outline" size={18} color={Colors.textTertiary} />
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
  iconBlob: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  streakChip: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  streakText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: '#FF9600',
  },
  right: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  deleteBtn: {
    padding: 2,
  },
});
