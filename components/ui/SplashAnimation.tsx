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
} from 'react-native-reanimated';
import { Colors, FontSize, FontWeight } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  // Logo circle
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  // Check icon
  const checkScale = useSharedValue(0);

  // Title
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);

  // Tagline
  const taglineOpacity = useSharedValue(0);

  // Whole container fade-out
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Logo pops in
    logoScale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 160 }));
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 300 }));

    // 2. Check icon
    checkScale.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 200 }));

    // 3. Title slides up
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 350 }));
    titleY.value = withDelay(600, withSpring(0, { damping: 14, stiffness: 120 }));

    // 4. Tagline
    taglineOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));

    // 5. Fade out
    containerOpacity.value = withDelay(
      1700,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onFinish)();
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
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

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['#1a3a00', '#0d2400', '#051200']}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.center}>
        {/* Logo circle — no image, pure gradient */}
        <Animated.View style={[styles.logoCircle, logoStyle]}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoGradient}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          >
            <Animated.Text style={[styles.checkText, checkStyle]}>✓</Animated.Text>
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
  center: {
    alignItems: 'center',
    gap: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: '800',
    lineHeight: 58,
    includeFontPadding: false,
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
    includeFontPadding: false,
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
    includeFontPadding: false,
  },
  tagline: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: FontWeight.medium,
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
  version: {
    position: 'absolute',
    bottom: 48,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: FontWeight.medium,
    letterSpacing: 1,
    includeFontPadding: false,
  },
});
