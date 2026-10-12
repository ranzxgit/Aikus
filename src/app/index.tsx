import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#E87532';

function RobotMark() {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(-9, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(float);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));

  return (
    <View style={styles.markStage} accessible={false}>
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />
      <Animated.View style={[styles.robot, floatStyle]}>
        <View style={styles.antennaStem} />
        <View style={styles.antennaTip} />
        <View style={styles.earLeft} />
        <View style={styles.earRight} />
        <View style={styles.robotFace}>
          <View style={styles.eyeRow}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </View>
          <View style={styles.smile} />
        </View>
        <View style={styles.cheekLeft} />
        <View style={styles.cheekRight} />
      </Animated.View>
      <View style={styles.sparkleOne} />
      <View style={styles.sparkleTwo} />
    </View>
  );
}

function LoadingDots() {
  return (
    <View style={styles.loadingRow} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1, 2].map((dot) => (
        <LoadingDot key={dot} delay={dot * 180} />
      ))}
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 640, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ translateY: -4 * progress.value }, { scale: 0.88 + progress.value * 0.12 }],
  }));

  return <Animated.View style={[styles.loadingDot, animatedStyle]} />;
}

export default function SplashScreen() {
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    const navigateToLogin = () => router.replace('/login' as never);
    const timer = setTimeout(() => {
      screenOpacity.value = withTiming(
        0,
        { duration: 420, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) scheduleOnRN(navigateToLogin);
        },
      );
    }, 2500);

    return () => {
      clearTimeout(timer);
      cancelAnimation(screenOpacity);
    };
  }, [screenOpacity]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  return (
    <Animated.View style={[styles.screen, screenStyle]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <RobotMark />
          <Text style={styles.title} accessibilityRole="header">AIKUS</Text>
          <Text style={styles.subtitle}>Your AI Companion for Care.</Text>
          <View style={styles.welcomePill}>
            <View style={styles.welcomeDot} />
            <Text style={styles.welcomeText}>Here for you, every day</Text>
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <LoadingDots />
          <Text style={styles.loadingText}>Getting things ready</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF9F4' },
  safeArea: { flex: 1, paddingHorizontal: 28 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  markStage: { width: 252, height: 252, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  glowOuter: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#F9D9C2', opacity: 0.36 },
  glowInner: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#F4BA91', opacity: 0.32 },
  robot: { width: 154, height: 142, borderRadius: 48, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', shadowColor: '#A94717', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 9 },
  antennaStem: { position: 'absolute', top: -19, width: 5, height: 24, borderRadius: 3, backgroundColor: '#B94E20' },
  antennaTip: { position: 'absolute', top: -27, width: 16, height: 16, borderRadius: 8, backgroundColor: '#F6AD72', borderWidth: 3, borderColor: '#FFF4EA' },
  earLeft: { position: 'absolute', left: -11, top: 54, width: 14, height: 36, borderRadius: 8, backgroundColor: '#C95522' },
  earRight: { position: 'absolute', right: -11, top: 54, width: 14, height: 36, borderRadius: 8, backgroundColor: '#C95522' },
  robotFace: { width: 116, height: 88, borderRadius: 31, backgroundColor: '#FFF9F4', alignItems: 'center', justifyContent: 'center', paddingTop: 5 },
  eyeRow: { flexDirection: 'row', gap: 27, marginBottom: 12 },
  eye: { width: 11, height: 13, borderRadius: 7, backgroundColor: '#653C31' },
  smile: { width: 23, height: 11, borderBottomWidth: 3, borderColor: ORANGE, borderRadius: 12 },
  cheekLeft: { position: 'absolute', left: 24, top: 82, width: 13, height: 7, borderRadius: 7, backgroundColor: '#F8B68C' },
  cheekRight: { position: 'absolute', right: 24, top: 82, width: 13, height: 7, borderRadius: 7, backgroundColor: '#F8B68C' },
  sparkleOne: { position: 'absolute', right: 18, top: 50, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F5B879' },
  sparkleTwo: { position: 'absolute', left: 23, bottom: 51, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EBA46F' },
  title: { color: '#32251F', fontSize: 38, lineHeight: 46, fontWeight: '800', letterSpacing: 5 },
  subtitle: { marginTop: 10, color: '#68574D', fontSize: 18, lineHeight: 26, textAlign: 'center', fontWeight: '500' },
  welcomePill: { marginTop: 25, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FCEBDD' },
  welcomeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D56A34' },
  welcomeText: { color: '#855332', fontSize: 14, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', minHeight: 84, justifyContent: 'center', paddingBottom: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, height: 18 },
  loadingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: ORANGE },
  loadingText: { marginTop: 10, color: '#806E63', fontSize: 14, letterSpacing: 0.2 },
});
