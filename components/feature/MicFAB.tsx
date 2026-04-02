import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Shadow } from '../../constants/theme';
import { PressableScale } from '../ui/PressableScale';

interface Props {
  isListening: boolean;
  onPress: () => void;
}

export function MicFAB({ isListening, onPress }: Props) {
  const ring1 = useSharedValue(1);
  const ring2 = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      ring1.value = withRepeat(
        withSequence(withTiming(1.6, { duration: 800 }), withTiming(1, { duration: 800 })),
        -1,
        false
      );
      ring1Opacity.value = withRepeat(
        withSequence(withTiming(0.35, { duration: 400 }), withTiming(0, { duration: 400 })),
        -1,
        false
      );
      ring2.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(2.1, { duration: 1000 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 200 }),
          withTiming(0.2, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(ring1);
      cancelAnimation(ring2);
      cancelAnimation(ring1Opacity);
      cancelAnimation(ring2Opacity);
      ring1.value = withSpring(1);
      ring2.value = withSpring(1);
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, ring1, ring2, ring1Opacity, ring2Opacity]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: ring2Opacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Pulse rings */}
      <Animated.View style={[styles.ring, ring2Style]} />
      <Animated.View style={[styles.ring, ring1Style]} />

      <PressableScale onPress={onPress} scaleTo={0.9} style={styles.fab}>
        <MaterialIcons
          name={isListening ? 'mic' : 'mic-none'}
          size={28}
          color="#fff"
        />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.green,
  },
});
