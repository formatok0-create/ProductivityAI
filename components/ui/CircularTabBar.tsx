import React, { useEffect } from 'react';
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
  runOnJS,
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Shadow } from '../../constants/theme';

interface TabItem {
  name: string;
  route: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
}

const TABS: TabItem[] = [
  { name: 'index',    route: '/',           icon: 'home',          label: 'Accueil',    color: Colors.primary,  bgColor: Colors.primaryLight },
  { name: 'tasks',    route: '/tasks',       icon: 'check-circle',  label: 'Tâches',     color: Colors.teal,     bgColor: Colors.tealLight },
  { name: 'routines', route: '/routines',    icon: 'loop',          label: 'Routines',   color: Colors.purple,   bgColor: Colors.purpleLight },
  { name: 'projects', route: '/projects',    icon: 'folder',        label: 'Projets',    color: Colors.orange,   bgColor: Colors.orangeLight },
  { name: 'calendar', route: '/calendar',    icon: 'calendar-today',label: 'Calendrier', color: Colors.pink,     bgColor: Colors.pinkLight },
  { name: 'stats',    route: '/stats',       icon: 'bar-chart',     label: 'Stats',      color: '#9B59B6',       bgColor: '#F3E8FF' },
  { name: 'settings', route: '/settings',    icon: 'settings',      label: 'Réglages',   color: Colors.textSecondary, bgColor: '#F3F4F6' },
];

// Arc config: full semicircle above the FAB
const RADIUS = 108;
const ARC_SPAN = 180;
const ARC_START = -ARC_SPAN / 2 - 90;
const FAB_SIZE = 62;
const CHILD_SIZE = 52;

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function getPosition(index: number, total: number) {
  const step = total === 1 ? 0 : ARC_SPAN / (total - 1);
  const angle = ARC_START + index * step;
  const rad = degToRad(angle);
  return {
    x: Math.cos(rad) * RADIUS,
    y: Math.sin(rad) * RADIUS,
  };
}

function TabButton({
  tab,
  index,
  total,
  open,
  isActive,
  onPress,
}: {
  tab: TabItem;
  index: number;
  total: number;
  open: boolean;
  isActive: boolean;
  onPress: () => void;
}) {
  const pos = getPosition(index, total);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (open) {
      const d = index * 40;
      scale.value = withDelay(d, withSpring(1, { damping: 12, stiffness: 200 }));
      opacity.value = withDelay(d, withTiming(1, { duration: 180 }));
      tx.value = withDelay(d, withSpring(pos.x, { damping: 13, stiffness: 180 }));
      ty.value = withDelay(d, withSpring(pos.y, { damping: 13, stiffness: 180 }));
    } else {
      const d = (TABS.length - 1 - index) * 25;
      scale.value = withDelay(d, withTiming(0, { duration: 160 }));
      opacity.value = withDelay(d, withTiming(0, { duration: 160 }));
      tx.value = withDelay(d, withSpring(0, { damping: 18, stiffness: 300 }));
      ty.value = withDelay(d, withSpring(0, { damping: 18, stiffness: 300 }));
    }
  }, [open]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.childWrapper, anim]}>
      {/* Label bubble */}
      <View style={[styles.labelBubble, { backgroundColor: isActive ? tab.color : tab.bgColor }]}>
        <Text style={[styles.labelText, { color: isActive ? '#fff' : tab.color }]}>
          {tab.label}
        </Text>
      </View>

      {/* Icon button */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.childBtn,
          {
            backgroundColor: isActive ? tab.color : tab.bgColor,
            borderColor: isActive ? tab.color : 'rgba(255,255,255,0.8)',
          },
          pressed && { opacity: 0.75, transform: [{ scale: 0.9 }] },
        ]}
        hitSlop={10}
        android_ripple={{ color: tab.color + '40', borderless: true, radius: 28 }}
      >
        <MaterialIcons
          name={tab.icon}
          size={22}
          color={isActive ? '#fff' : tab.color}
        />
      </Pressable>
    </Animated.View>
  );
}

export function CircularTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  const rotation = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const backdropOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  // Determine active tab
  const activeName =
    pathname === '/' || pathname === '/index'
      ? 'index'
      : pathname.replace('/', '');

  const activeTab = TABS.find(t => t.name === activeName) ?? TABS[0];

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      rotation.value = withSpring(45, { damping: 12, stiffness: 200 });
      fabScale.value = withSequence(
        withSpring(1.18, { damping: 8, stiffness: 260 }),
        withSpring(1.0, { damping: 12, stiffness: 200 })
      );
      backdropOpacity.value = withTiming(1, { duration: 250 });
      // ring burst
      ringOpacity.value = withSequence(
        withTiming(0.6, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );
      ringScale.value = withSequence(
        withTiming(1, { duration: 0 }),
        withSpring(2.2, { damping: 10, stiffness: 120 })
      );
    } else {
      rotation.value = withSpring(0, { damping: 12, stiffness: 220 });
      fabScale.value = withSpring(1, { damping: 10, stiffness: 240 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  };

  const handleTabPress = (tab: TabItem) => {
    setIsOpen(false);
    rotation.value = withSpring(0, { damping: 14, stiffness: 220 });
    fabScale.value = withSpring(1, { damping: 12, stiffness: 240 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(() => {
      router.push(tab.route as any);
    }, 80);
  };

  const fabAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const bottomOffset = insets.bottom + 20;

  return (
    <>
      {/* Backdrop */}
      {isOpen ? (
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={toggle} />
        </Animated.View>
      ) : null}

      {/* FAB + radial tabs */}
      <View
        style={[styles.fabContainer, { bottom: bottomOffset }]}
        pointerEvents="box-none"
      >
        {/* Tab buttons */}
        {TABS.map((tab, i) => (
          <TabButton
            key={tab.name}
            tab={tab}
            index={i}
            total={TABS.length}
            open={isOpen}
            isActive={tab.name === activeName}
            onPress={() => handleTabPress(tab)}
          />
        ))}

        {/* Ring burst */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Main FAB */}
        <Animated.View style={fabAnimStyle}>
          <Pressable
            onPress={toggle}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: isOpen ? Colors.text : activeTab.color },
              pressed && { opacity: 0.88 },
            ]}
            android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true, radius: 32 }}
          >
            {isOpen ? (
              <MaterialIcons name="close" size={28} color="#fff" />
            ) : (
              <MaterialIcons name={activeTab.icon} size={28} color="#fff" />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    height: FAB_SIZE,
  },
  ring: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  childWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  labelBubble: {
    position: 'absolute',
    top: -24,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  labelText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.2,
  },
});
