import { router, useLocalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppFlow } from '@/providers/app-flow-provider';
import { isOllamaReachable } from '@/services/ollamaHealth';
import {
  createNavigationGuard,
  getSplashMotionMode,
  getSplashLogoFallbackText,
  shouldForceFullMotion,
  SPLASH_EXIT_START_MS,
  SPLASH_EXIT_MS,
  SPLASH_REDUCED_MOTION_FADE_MS,
  waitForSplashMaximum,
  waitForSplashMinimum,
} from '@/theme/splashFlow';
import { getProfileSettings, getProfiles, setOllamaReachable } from '@/services/profileStore';
import { splashBackground } from '@/theme/tokens';
import type { AnimationPreference } from '@/types/profile';

const SPLASH_LOGO = require('../../logo.png') as number;
const SPLASH_OLLAMA_TIMEOUT_MS = 3_000;
const SPLASH_BACKGROUND_HOLD_MS = 300;
const SPLASH_LOGO_FADE_IN_MS = 500;
const SPLASH_LOGO_POP_SPRING = { damping: 11, stiffness: 110, mass: 1 };
const SPLASH_RING_START_MS = 500;
const SPLASH_RING_SECOND_DELAY_MS = 250;
const SPLASH_RING_DURATION_MS = 1_300;
const SPLASH_RING_FADE_IN_MS = 180;
const SPLASH_SHINE_START_MS = 1_500;
const SPLASH_SHINE_DURATION_MS = 800;
const SPLASH_FLOAT_START_MS = 1_800;
const SPLASH_FLOAT_HALF_CYCLE_MS = 1_200;
const SPLASH_FLOAT_DISTANCE_PX = 6;
const SPLASH_TAGLINE_START_MS = 2_000;
const SPLASH_TAGLINE_DURATION_MS = 600;
const SPLASH_LOADING_START_MS = 2_600;
const SPLASH_LOADING_FADE_MS = 300;
const SPLASH_DOT_STAGGER_MS = 350;
const SPLASH_DOT_FADE_MS = 300;
const SPLASH_LOGO_WIDTH = 200;
const SPLASH_TEXT_COLOR = '#2B2118';

const SplashLogoImage = memo(function SplashLogoImage({
  onLoad,
  onError,
}: {
  onLoad: () => void;
  onError: () => void;
}) {
  return (
    <Image
      source={SPLASH_LOGO}
      resizeMode="contain"
      onLoad={onLoad}
      onError={onError}
      style={styles.logoImage}
      accessible={false}
    />
  );
});

export default function LoadingScreen() {
  const { isReady, hasChosenLanguage, activeProfile, language, setOllamaStatus } = useAppFlow();
  const { motion } = useLocalSearchParams<{ motion?: string | string[] }>();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const systemReducedMotion = useReducedMotion();
  const forceFullMotion = shouldForceFullMotion(__DEV__, Platform.OS === 'web', motion);
  const wakingText = language === 'tl' ? 'Ginigising si Aikus...' : 'Waking up Aikus...';
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [animationPreference, setAnimationPreference] = useState<AnimationPreference>('system');
  const [loadedPreferenceProfileId, setLoadedPreferenceProfileId] = useState<string | null | undefined>(undefined);
  const navigationGuard = useRef(createNavigationGuard());
  const exiting = useRef(false);
  const hiddenNativeSplash = useRef(false);
  const nextRoute = useRef<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [hasLogo, setHasLogo] = useState(true);
  const [frameHasLayout, setFrameHasLayout] = useState(false);
  const motionPreferenceLoaded = isReady && loadedPreferenceProfileId === (activeProfile?.id ?? null);
  const motionMode = getSplashMotionMode(systemReducedMotion, animationPreference, forceFullMotion);
  const reducedMotion = motionMode === 'reduced';

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(-6);
  const logoFloat = useSharedValue(0);
  const firstRingScale = useSharedValue(0.9);
  const firstRingOpacity = useSharedValue(0);
  const secondRingScale = useSharedValue(0.9);
  const secondRingOpacity = useSharedValue(0);
  const shineProgress = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const taglineRise = useSharedValue(10);
  const loadingOpacity = useSharedValue(0);
  const firstDotOpacity = useSharedValue(0);
  const secondDotOpacity = useSharedValue(0);
  const thirdDotOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    if (!logoLoaded || !frameHasLayout || !motionPreferenceLoaded || startedAt !== null) return;
    const frame = requestAnimationFrame(() => setStartedAt(Date.now()));
    return () => cancelAnimationFrame(frame);
  }, [frameHasLayout, logoLoaded, motionPreferenceLoaded, startedAt]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    const loadedPreference = activeProfile
      ? getProfileSettings(activeProfile).then((settings) => settings.animationPreference)
      : Promise.resolve('system' as const);
    void loadedPreference
      .then((preference) => {
        if (!active) return;
        setAnimationPreference(preference);
        setLoadedPreferenceProfileId(activeProfile?.id ?? null);
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Could not load the animation preference; following system motion settings.', error);
        if (!active) return;
        setAnimationPreference('system');
        setLoadedPreferenceProfileId(activeProfile?.id ?? null);
      });
    return () => { active = false; };
  }, [activeProfile, isReady]);

  useEffect(() => {
    if (!__DEV__ || !motionPreferenceLoaded) return;
    console.info(`[Aikus splash] useReducedMotion() returned ${systemReducedMotion}; motion mode: ${motionMode}.`);
  }, [motionMode, motionPreferenceLoaded, systemReducedMotion]);

  const navigateAfterExit = useCallback(() => {
    if (!navigationGuard.current()) return;
    router.replace((nextRoute.current ?? '/(auth)/language') as never);
  }, []);

  const beginExit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
    screenOpacity.value = withTiming(
      0,
      { duration: SPLASH_EXIT_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never },
      (finished) => {
        if (finished) runOnJS(navigateAfterExit)();
      },
    );
  }, [navigateAfterExit, screenOpacity]);

  useEffect(() => {
    if (startedAt === null) return;
    const maximumTimerActive = { current: true };
    void waitForSplashMaximum(startedAt).then(() => {
      if (maximumTimerActive.current) beginExit();
    });
    return () => {
      maximumTimerActive.current = false;
    };
  }, [beginExit, startedAt]);

  useEffect(() => {
    if (startedAt === null || !isReady) return;
    let active = true;
    const minimumWindow = waitForSplashMinimum(startedAt, SPLASH_EXIT_START_MS);

    void (async () => {
      const [reachable, savedProfiles] = await Promise.all([
        isOllamaReachable(SPLASH_OLLAMA_TIMEOUT_MS),
        getProfiles().catch(() => []),
      ]);
      await setOllamaReachable(reachable).catch(() => undefined);
      if (!active) return;
      setOllamaStatus(reachable);

      const savedProfileExists = Boolean(
        activeProfile && savedProfiles.some((profile) => profile.id === activeProfile.id),
      );
      nextRoute.current = savedProfileExists
        ? '/(app)/home'
        : hasChosenLanguage
          ? '/(auth)/login'
          : '/(auth)/language';

      await minimumWindow;
      if (active) beginExit();
    })();

    return () => {
      active = false;
    };
  }, [activeProfile, beginExit, hasChosenLanguage, isReady, setOllamaStatus, startedAt]);

  useEffect(() => {
    if (startedAt === null || !logoLoaded || !frameHasLayout) return;
    if (reducedMotion) {
      logoScale.value = 0.97;
      logoRotation.value = 0;
      logoFloat.value = 0;
      logoOpacity.value = withTiming(1, {
        duration: SPLASH_REDUCED_MOTION_FADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      });
      logoScale.value = withTiming(1, {
        duration: SPLASH_REDUCED_MOTION_FADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      });
      taglineOpacity.value = 1;
      taglineRise.value = 0;
      loadingOpacity.value = 1;
    } else {
      const spring = { ...SPLASH_LOGO_POP_SPRING, reduceMotion: ReduceMotion.Never };
      logoOpacity.value = withDelay(
        SPLASH_BACKGROUND_HOLD_MS,
        withTiming(1, {
          duration: SPLASH_LOGO_FADE_IN_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      logoScale.value = withDelay(SPLASH_BACKGROUND_HOLD_MS, withSpring(1, spring), ReduceMotion.Never);
      logoRotation.value = withDelay(SPLASH_BACKGROUND_HOLD_MS, withSpring(0, spring), ReduceMotion.Never);

      const secondRingStart = SPLASH_RING_START_MS + SPLASH_RING_SECOND_DELAY_MS;
      firstRingScale.value = withDelay(
        SPLASH_RING_START_MS,
        withTiming(1.6, {
          duration: SPLASH_RING_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      firstRingOpacity.value = withDelay(
        SPLASH_RING_START_MS,
        withSequence(
          withTiming(0.6, {
            duration: SPLASH_RING_FADE_IN_MS,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
          withTiming(0, {
            duration: SPLASH_RING_DURATION_MS - SPLASH_RING_FADE_IN_MS,
            easing: Easing.in(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
        ),
        ReduceMotion.Never,
      );
      secondRingScale.value = withDelay(
        secondRingStart,
        withTiming(1.6, {
          duration: SPLASH_RING_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      secondRingOpacity.value = withDelay(
        secondRingStart,
        withSequence(
          withTiming(0.6, {
            duration: SPLASH_RING_FADE_IN_MS,
            easing: Easing.out(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
          withTiming(0, {
            duration: SPLASH_RING_DURATION_MS - SPLASH_RING_FADE_IN_MS,
            easing: Easing.in(Easing.cubic),
            reduceMotion: ReduceMotion.Never,
          }),
        ),
        ReduceMotion.Never,
      );
      shineProgress.value = withDelay(
        SPLASH_SHINE_START_MS,
        withTiming(1, {
          duration: SPLASH_SHINE_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      logoFloat.value = withDelay(
        SPLASH_FLOAT_START_MS,
        withRepeat(
          withSequence(
            withTiming(-SPLASH_FLOAT_DISTANCE_PX, {
              duration: SPLASH_FLOAT_HALF_CYCLE_MS,
              easing: Easing.inOut(Easing.sin),
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(SPLASH_FLOAT_DISTANCE_PX, {
              duration: SPLASH_FLOAT_HALF_CYCLE_MS,
              easing: Easing.inOut(Easing.sin),
              reduceMotion: ReduceMotion.Never,
            }),
          ),
          -1,
          false,
          undefined,
          ReduceMotion.Never,
        ),
        ReduceMotion.Never,
      );
      taglineOpacity.value = withDelay(
        SPLASH_TAGLINE_START_MS,
        withTiming(1, {
          duration: SPLASH_TAGLINE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      taglineRise.value = withDelay(
        SPLASH_TAGLINE_START_MS,
        withTiming(0, {
          duration: SPLASH_TAGLINE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      loadingOpacity.value = withDelay(
        SPLASH_LOADING_START_MS,
        withTiming(1, {
          duration: SPLASH_LOADING_FADE_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      firstDotOpacity.value = withDelay(
        SPLASH_LOADING_START_MS,
        withTiming(1, {
          duration: SPLASH_DOT_FADE_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      secondDotOpacity.value = withDelay(
        SPLASH_LOADING_START_MS + SPLASH_DOT_STAGGER_MS,
        withTiming(1, {
          duration: SPLASH_DOT_FADE_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
      thirdDotOpacity.value = withDelay(
        SPLASH_LOADING_START_MS + SPLASH_DOT_STAGGER_MS * 2,
        withTiming(1, {
          duration: SPLASH_DOT_FADE_MS,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        ReduceMotion.Never,
      );
    }

    return () => {
      [
        logoScale,
        logoOpacity,
        logoRotation,
        logoFloat,
        firstRingScale,
        firstRingOpacity,
        secondRingScale,
        secondRingOpacity,
        shineProgress,
        taglineOpacity,
        taglineRise,
        loadingOpacity,
        firstDotOpacity,
        secondDotOpacity,
        thirdDotOpacity,
      ].forEach(cancelAnimation);
    };
  }, [
    frameHasLayout,
    logoLoaded,
    startedAt,
    reducedMotion,
    logoScale,
    logoOpacity,
    logoRotation,
    logoFloat,
    firstRingScale,
    firstRingOpacity,
    secondRingScale,
    secondRingOpacity,
    shineProgress,
    taglineOpacity,
    taglineRise,
    loadingOpacity,
    firstDotOpacity,
    secondDotOpacity,
    thirdDotOpacity,
  ]);

  useEffect(() => {
    if (!logoLoaded || !frameHasLayout || hiddenNativeSplash.current) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (hiddenNativeSplash.current) return;
        hiddenNativeSplash.current = true;
        void SplashScreen.hideAsync();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [frameHasLayout, logoLoaded]);

  const width = viewportWidth || 390;
  const logoWidth = Math.min(SPLASH_LOGO_WIDTH, Math.max(0, width * 0.72));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateY: logoFloat.value },
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));
  const firstRingStyle = useAnimatedStyle(() => ({
    opacity: firstRingOpacity.value,
    transform: [{ scale: firstRingScale.value }],
  }));
  const secondRingStyle = useAnimatedStyle(() => ({
    opacity: secondRingOpacity.value,
    transform: [{ scale: secondRingScale.value }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shineProgress.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0], 'clamp'),
    transform: [
      { translateX: interpolate(shineProgress.value, [0, 1], [-logoWidth, logoWidth]) },
      { rotate: '-25deg' },
    ],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : taglineOpacity.value,
    transform: [{ translateY: reducedMotion ? 0 : taglineRise.value }],
  }));
  const loadingStyle = useAnimatedStyle(() => ({ opacity: reducedMotion ? 1 : loadingOpacity.value }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const firstDotStyle = useAnimatedStyle(() => ({ opacity: firstDotOpacity.value }));
  const secondDotStyle = useAnimatedStyle(() => ({ opacity: secondDotOpacity.value }));
  const thirdDotStyle = useAnimatedStyle(() => ({ opacity: thirdDotOpacity.value }));

  const onLogoLoad = useCallback(() => {
    setHasLogo(true);
    setLogoLoaded(true);
  }, [setHasLogo, setLogoLoaded]);
  const onLogoError = useCallback(() => {
    setHasLogo(false);
    setLogoLoaded(true);
  }, [setHasLogo, setLogoLoaded]);
  const onFrameLayout = useCallback(() => {
    setFrameHasLayout(true);
  }, [setFrameHasLayout]);

  return (
    <Animated.View onLayout={onFrameLayout} style={[styles.screen, screenStyle]}>
      <StatusBar style="dark" />
      <View style={[styles.column, { paddingBottom: viewportHeight * 0.1 }]}>
        <View style={styles.content}>
          <View style={styles.logoGroup}>
            <View style={[styles.logoFrame, { width: logoWidth }]}>
              {!reducedMotion ? (
                <>
                  <Animated.View style={[styles.ring, firstRingStyle]} />
                  <Animated.View style={[styles.ring, secondRingStyle]} />
                </>
              ) : null}
              <Animated.View accessible accessibilityRole="image" accessibilityLabel="Aikus" style={[styles.logo, logoStyle]}>
                {hasLogo ? (
                  <SplashLogoImage onLoad={onLogoLoad} onError={onLogoError} />
                ) : (
                  <Text style={[styles.logoFallback, { width: logoWidth }]}>{getSplashLogoFallbackText()}</Text>
                )}
              </Animated.View>
              {!reducedMotion && hasLogo ? (
                <View style={styles.shineClip}>
                  <Animated.View style={[styles.shineBar, { width: logoWidth * 0.45 }, shineStyle]}>
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                      locations={[0, 0.5, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                </View>
              ) : null}
            </View>

            <Animated.Text accessibilityRole="header" style={[styles.tagline, taglineStyle]}>
              {language === 'tl' ? 'Ang kaibigan ninyo' : 'Your friendly companion'}
            </Animated.Text>
          </View>

          <Animated.View
            style={[styles.loadingGroup, loadingStyle]}
          >
            {!reducedMotion ? (
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dots}>
                <Animated.View style={[styles.dot, firstDotStyle]} />
                <Animated.View style={[styles.dot, secondDotStyle]} />
                <Animated.View style={[styles.dot, thirdDotStyle]} />
              </View>
            ) : null}
            <Text accessibilityLiveRegion="polite" style={styles.loadingText}>{wakingText}</Text>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: splashBackground },
  column: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  content: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  logoGroup: { width: '100%', alignItems: 'center' },
  logoFrame: { width: '100%', aspectRatio: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  logo: { width: '100%', aspectRatio: 1, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: '100%', height: '100%', aspectRatio: 1, alignSelf: 'center' },
  logoFallback: { color: SPLASH_TEXT_COLOR, fontSize: 44, lineHeight: 58, fontWeight: '800', letterSpacing: 8, textAlign: 'center' },
  ring: { position: 'absolute', width: '100%', height: '100%', borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 999, pointerEvents: 'none' },
  shineClip: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', zIndex: 2, pointerEvents: 'none' },
  shineBar: { position: 'absolute', top: '10%', height: '80%', borderRadius: 999 },
  tagline: { marginTop: 24, width: '100%', color: SPLASH_TEXT_COLOR, fontSize: 18, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  loadingGroup: { marginTop: 32, alignItems: 'center', gap: 12 },
  dots: { height: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SPLASH_TEXT_COLOR },
  loadingText: { color: SPLASH_TEXT_COLOR, fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
});
