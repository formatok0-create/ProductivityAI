import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Shadow } from '../../constants/theme';

export interface RadialAction {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

interface Props {
  actions: RadialAction[];
}

// How many degrees the arc spans and at what rotation it starts
const ARC_SPAN = 180; // degrees: left semicircle above FAB
const ARC_START = -ARC_SPAN / 2 - 90; // starts at top-left, ends at top-right
const RADIUS = 90; // distance from FAB center to child button center
const FAB_SIZE = 60;
const CHILD_SIZE = 50;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function getChildPosition(index: number, total: number) {
  const step = total === 1 ? 0 : ARC_SPAN / (total - 1);
  const angle = ARC_START + index * step;
  const rad = degToRad(angle);
  return {
    x: Math.cos(rad) * RADIUS,
    y: Math.sin(rad) * RADIUS,
  };
}

function ChildButton({
  action,
  position,
  index,
  open,
  onPress,
}: {
  action: RadialAction;
  position: { x: number; y: number };
  index: number;
  open: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (open) {
      const delay = index * 45;
      scale.value = withDelay(delay, withSpring(1, { damping: 13, stiffness: 200 }));
      opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
      translateX.value = withDelay(delay, withSpring(position.x, { damping: 13, stiffness: 180 }));
      translateY.value = withDelay(delay, withSpring(position.y, { damping: 13, stiffness: 180 }));
    } else {
      const delay = (3 - index) * 30;
      scale.value = withDelay(delay, withTiming(0, { duration: 180 }));
      opacity.value = withDelay(delay, withTiming(0, { duration: 180 }));
      translateX.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 280 }));
      translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 280 }));
    }
  }, [open]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.childWrapper, animStyle]}>
      {/* Label */}
      <View style={[styles.labelBubble, { backgroundColor: action.bgColor }]}>
        <Text style={[styles.labelText, { color: action.color }]}>{action.label}</Text>
      </View>
      {/* Button */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.childBtn,
          { backgroundColor: action.bgColor },
          pressed && { opacity: 0.75, transform: [{ scale: 0.92 }] },
        ]}
        hitSlop={10}
        android_ripple={{ color: action.color + '40', borderless: true, radius: 28 }}
      >
        <MaterialIcons name={action.icon} size={22} color={action.color} />
      </Pressable>
    </Animated.View>
  );
}

export function RadialFAB({ actions }: Props) {
  const open = useSharedValue(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Main FAB rotation & scale
  const rotation = useSharedValue(0);
  const fabScale = useSharedValue(1);

  // Backdrop
  const backdropOpacity = useSharedValue(0);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    open.value = next;

    if (next) {
      rotation.value = withSpring(45, { damping: 12, stiffness: 200 });
      fabScale.value = withSequence(
        withSpring(1.15, { damping: 8, stiffness: 260 }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      rotation.value = withSpring(0, { damping: 12, stiffness: 220 });
      fabScale.value = withSpring(1, { damping: 10, stiffness: 240 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  };

  const handleChildPress = (action: RadialAction) => {
    // Close first, then fire action
    setIsOpen(false);
    open.value = false;
    rotation.value = withSpring(0, { damping: 14, stiffness: 220 });
    fabScale.value = withSpring(1, { damping: 12, stiffness: 240 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => action.onPress(), 100);
  };

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Tap-to-close backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={toggle} />
      </Animated.View>

      {/* Child buttons rendered relative to FAB center */}
      <View style={styles.anchor} pointerEvents="box-none">
        {actions.map((action, i) => (
          <ChildButton
            key={action.label}
            action={action}
            position={getChildPosition(i, actions.length)}
            index={i}
            open={isOpen}
            onPress={() => handleChildPress(action)}
          />
        ))}

        {/* Main FAB */}
        <Animated.View style={fabAnimStyle}>
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [
              styles.fab,
              pressed && { opacity: 0.88 },
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 32 }}
          >
            <MaterialIcons name="add" size={30} color="#fff" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 0,
  },
  // anchor is the pivot point — children animate outward from here
  anchor: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.green,
    // Extra border ring
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  childWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Center child button over the anchor point
    width: CHILD_SIZE,
    height: CHILD_SIZE,
    marginLeft: -(CHILD_SIZE / 2) + FAB_SIZE / 2,
    marginTop: -(CHILD_SIZE / 2) + FAB_SIZE / 2,
  },
  childBtn: {
    width: CHILD_SIZE,
    height: CHILD_SIZE,
    borderRadius: CHILD_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.medium,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  labelBubble: {
    position: 'absolute',
    top: -22,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    ...Shadow.soft,
  },
  labelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.3,
  },
});
