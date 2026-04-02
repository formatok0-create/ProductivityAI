import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

// Animated check path inside the logo
function CheckIcon({ progress }: { progress: Animated.SharedValue<number> }) {
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));
  return (
    <Animated.View style={[styles.checkIcon, scaleStyle]}>
      <Text style={styles.checkText}>✓</Text>
    </Animated.View>
  );
}

// Single floating particle
function Particle({
  x,
  y,
  delay,
  color,
  size,
}: {
  x: number;
  y: number;
  delay: number;
  color: string;
  size: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(600, withTiming(0, { duration: 400 }))
      )
    );
    translateY.value = withDelay(
      delay,
      withTiming(-80, { duration: 1200, easing: Easing.out(Easing.quad) })
    );
    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1, { damping: 10, stiffness: 200 }),
        withDelay(500, withTiming(0.5, { duration: 400 }))
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        style,
        { left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    />
  );
}

const PARTICLES = [
  { x: W * 0.15, y: H * 0.42, color: Colors.primary, size: 10, delay: 800 },
  { x: W * 0.75, y: H * 0.38, color: Colors.xpYellow, size: 8, delay: 900 },
  { x: W * 0.5,  y: H * 0.35, color: '#fff', size: 6, delay: 850 },
  { x: W * 0.3,  y: H * 0.45, color: Colors.teal, size: 9, delay: 1000 },
  { x: W * 0.65, y: H * 0.44, color: Colors.purple, size: 7, delay: 950 },
  { x: W * 0.2,  y: H * 0.36, color: Colors.orange, size: 8, delay: 870 },
  { x: W * 0.82, y: H * 0.46, color: Colors.primary, size: 11, delay: 920 },
  { x: W * 0.42, y: H * 0.32, color: Colors.pink, size: 6, delay: 980 },
];

export function SplashAnimation({ onFinish }: Props) {
  // Logo circle
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // Ring pulse
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  // Check icon
  const checkProgress = useSharedValue(0);

  // Title
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(24);

  // Tagline
  const taglineOpacity = useSharedValue(0);

  // Whole container fade-out
  const containerOpacity = useSharedValue(1);

  // Background blob
  const blobScale = useSharedValue(0.5);

  useEffect(() => {
    // 1. Background blob
    blobScale.value = withTiming(1.2, { duration: 1000, easing: Easing.out(Easing.cubic) });

    // 2. Ring pulse appears
    ringOpacity.value = withDelay(100, withTiming(0.4, { duration: 400 }));
    ringScale.value = withDelay(
      100,
      withSequence(
        withSpring(1.3, { damping: 8, stiffness: 80 }),
        withSpring(1.0, { damping: 12 })
      )
    );

    // 3. Logo pops in
    logoScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 180 })
    );
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // 4. Check animates in
    checkProgress.value = withDelay(
      500,
      withSpring(1, { damping: 12, stiffness: 200 })
    );

    // 5. Ring fades to 0
    ringOpacity.value = withDelay(700, withTiming(0, { duration: 300 }));

    // 6. Title slides up
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    titleY.value = withDelay(
      700,
      withSpring(0, { damping: 14, stiffness: 120 })
    );

    // 7. Tagline fades in
    taglineOpacity.value = withDelay(950, withTiming(1, { duration: 400 }));

    // 8. Whole screen fades out
    containerOpacity.value = withDelay(
      1800,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blobScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#1a3a00', '#0d2400', '#051200']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background decorative blob */}
      <Animated.View style={[styles.blob, blobStyle]} />
      <Animated.View style={[styles.blob2, blobStyle]} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      {/* Center content */}
      <View style={styles.center}>
        {/* Pulse ring */}
        <Animated.View style={[styles.ring, ringStyle]} />

        {/* Logo circle */}
        <Animated.View style={[styles.logoCircle, logoStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <CheckIcon progress={checkProgress} />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleRow, titleStyle]}>
          <Text style={styles.titleBold}>Productivity</Text>
          <View style={styles.titleBadge}>
            <Text style={styles.titleBadgeText}>AI</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Organisé. Motivé. Productif.
        </Animated.Text>
      </View>

      {/* Bottom version */}
      <Animated.Text style={[styles.version, taglineStyle]}>v1.0</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  blob: {
    position: 'absolute',
    width: W * 1.4,
    height: W * 1.4,
    borderRadius: W * 0.7,
    backgroundColor: Colors.primary + '12',
    top: -W * 0.5,
    left: -W * 0.2,
  },
  blob2: {
    position: 'absolute',
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    backgroundColor: Colors.teal + '10',
    bottom: H * 0.1,
    right: -W * 0.2,
  },
  center: {
    alignItems: 'center',
    gap: 20,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 52,
    color: '#fff',
    fontWeight: '800',
    lineHeight: 60,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  titleBold: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: -0.5,
  },
  titleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  titleBadgeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: FontWeight.medium,
    letterSpacing: 0.3,
  },
  particle: {
    position: 'absolute',
  },
  version: {
    position: 'absolute',
    bottom: 48,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: FontWeight.medium,
    letterSpacing: 1,
  },
});
