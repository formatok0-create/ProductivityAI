import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export function CheckButton({ checked, onToggle, size = 28 }: Props) {
  const scale = useSharedValue(1);
  const progress = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(checked ? 1 : 0, { damping: 14, stiffness: 300 });
  }, [checked, progress]);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(0.7, { damping: 10, stiffness: 500 }),
      withSpring(1.2, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 12, stiffness: 300 })
    );
    onToggle();
  }, [onToggle, scale]);

  const bgColor = useDerivedValue(() =>
    interpolateColor(progress.value, [0, 1], ['#F3F4F6', Colors.primary])
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: bgColor.value,
    borderColor: progress.value > 0.5 ? Colors.primary : '#D1D5DB',
  }));

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, containerStyle]}>
        {checked && (
          <MaterialIcons name="check" size={size * 0.6} color="#fff" />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
