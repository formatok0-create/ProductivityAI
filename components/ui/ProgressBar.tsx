import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, Radii } from '../../constants/theme';

interface Props {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  height = 8,
  style,
  animated = true,
}: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(1, Math.max(0, progress));
    if (animated) {
      width.value = withSpring(clamped, { damping: 18, stiffness: 120 });
    } else {
      width.value = clamped;
    }
  }, [progress, animated, width]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color, height, borderRadius: height / 2 },
          barStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
