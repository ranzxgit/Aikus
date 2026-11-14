import { router, useLocalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppFlow } from '@/providers/app-flow-provider';
import { isOllamaReachable } from '@/services/ollamaHealth';
import {
  createNavigationGuard,
  getSplashMotionMode,
  getSplashLogoFallbackText,
  shouldForceFullMotion,
  SPLASH_REDUCED_MOTION_FADE_MS,
  waitForSplashMaximum,
  waitForSplashMinimum,
} from '@/theme/splashFlow';
import { getProfileSettings, getProfiles, setOllamaReachable } from '@/services/profileStore';
import {
  splashBackground,
  splashGlow,
  splashLogoShadow,
  splashProgressFill,
  splashProgressTrack,
  splashText,
} from '@/theme/tokens';
import type { AnimationPreference } from '@/types/profile';

/* ─────────────────── constants ─────────────────── */

const SPLASH_LOGO = require('../../logo.png') as number;
const SPLASH_OLLAMA_TIMEOUT_MS = 3_000;
const SPLASH_TOTAL_MS = 4_000;

// Animation timing (full motion)
const BACKGROUND_HOLD_MS = 250;
const LOGO_FADE_START_MS = BACKGROUND_HOLD_MS;
const LOGO_FADE_DURATION_MS = 1_000;
const LOGO_SCALE_FROM = 0.92;
const GLOW_FADE_START_MS = 400;
const GLOW_FADE_DURATION_MS = 1_200;
const GLOW_SCALE_FROM = 0.9;
const PROGRESS_FADE_START_MS = 1_300;
const PROGRESS_FADE_DURATION_MS = 300;
const FLOAT_START_MS = 1_250;
const FLOAT_HALF_CYCLE_MS = 1_500;
const FLOAT_DISTANCE_PX = 4;
const EXIT_DURATION_MS = 400;
const EXIT_SCALE_TO = 1.03;
const EXIT_START_MS = SPLASH_TOTAL_MS - EXIT_DURATION_MS;

// Reduced motion
const REDUCED_MOTION_MIN_MS = 1_500;

// Progress line
const PROGRESS_WIDTH = 120;
const PROGRESS_HEIGHT = 3;
const PROGRESS_SEGMENT_WIDTH = 40;
const PROGRESS_SWEEP_MS = 1_400;
const GLOW_STEPS = 32;

// Logo sizing
const SPLASH_LOGO_WIDTH_PHONE = 200;
const SPLASH_LOGO_WIDTH_MAX = 240;
const SPLASH_LOGO_WIDTH_RATIO = 0.52;

const LOGO_SHADOW_OPACITY = 0.18;

/* ─────────────────── sub-components ─────────────────── */

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

/**
 * Indeterminate progress line: a 40px segment sweeping left-to-right
 * inside a 120px track every 1.4s with ease-in-out, repeating.
 */
function ProgressLine({
  opacity,
  isActive,
  isReduced,
}: {
  opacity: SharedValue<number>;
  isActive: boolean;
  isReduced: boolean;
}) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (isReduced || !isActive) return;
    sweep.value = withDelay(
      PROGRESS_FADE_START_MS,
      withRepeat(
        withTiming(1, {
          duration: PROGRESS_SWEEP_MS,
          easing: Easing.inOut(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
        -1,
        false,
        undefined,
        ReduceMotion.Never,
      ),
      ReduceMotion.Never,
    );
    return () => cancelAnimation(sweep);
  }, [isActive, isReduced, sweep]);

  const trackStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const fillStyle = useAnimatedStyle(() => {
    if (isReduced) {
      return { width: PROGRESS_WIDTH };
    }
    const translateX = sweep.value * (PROGRESS_WIDTH - PROGRESS_SEGMENT_WIDTH);
    return {
      width: PROGRESS_SEGMENT_WIDTH,
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View style={[styles.progressTrack, trackStyle]}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </Animated.View>
  );
}

/* ─────────────────── main screen ─────────────────── */

export default function LoadingScreen() {
  const { isReady, hasChosenLanguage, activeProfile, language, setOllamaStatus } = useAppFlow();
  const { motion } = useLocalSearchParams<{ motion?: string | string[] }>();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const systemReducedMotion = useReducedMotion();
  const forceFullMotion = shouldForceFullMotion(__DEV__, Platform.OS === 'web', motion);

  // Translations kept even though text is no longer shown on screen
  const _wakingText = language === 'tl' ? 'Ginigising si Aikus...' : 'Waking up Aikus...';
  const _taglineText = language === 'tl' ? 'Ang kaibigan ninyo' : 'Your friendly companion';
  void _wakingText;
  void _taglineText;
  const screenReaderText = language === 'tl' ? 'Sinisimulan si Aikus' : 'Starting Aikus';

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

  /* ── shared values ── */
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(LOGO_SCALE_FROM);
  const logoFloat = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(GLOW_SCALE_FROM);
  const progressOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  /* ── start timer once layout + logo + prefs are ready ── */
  useEffect(() => {
    if (!logoLoaded || !frameHasLayout || !motionPreferenceLoaded || startedAt !== null) return;
    const frame = requestAnimationFrame(() => setStartedAt(Date.now()));
    return () => cancelAnimationFrame(frame);
  }, [frameHasLayout, logoLoaded, motionPreferenceLoaded, startedAt]);

  /* ── load animation preference from profile ── */
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

  /* ── dev log ── */
  useEffect(() => {
    if (!__DEV__ || !motionPreferenceLoaded) return;
    console.info(`[Aikus splash] useReducedMotion() returned ${systemReducedMotion}; motion mode: ${motionMode}.`);
  }, [motionMode, motionPreferenceLoaded, systemReducedMotion]);

  /* ── navigation ── */
  const navigateAfterExit = useCallback(() => {
    if (!navigationGuard.current()) return;
    router.replace((nextRoute.current ?? '/(auth)/language') as never);
  }, []);

  const beginExit = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    if (reducedMotion) {
      navigateAfterExit();
      return;
    }
    // Exit: everything fades out, logo scales to 1.03
    // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
    logoScale.value = withTiming(EXIT_SCALE_TO, {
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    });
    // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
    screenOpacity.value = withTiming(
      0,
      { duration: EXIT_DURATION_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never },
      (finished) => {
        if (finished) runOnJS(navigateAfterExit)();
      },
    );
  }, [logoScale, navigateAfterExit, reducedMotion, screenOpacity]);

  /* ── maximum timeout ── */
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

  /* ── background checks (Ollama, profiles) ── */
  useEffect(() => {
    if (startedAt === null || !isReady) return;
    let active = true;
    const minimumMs = reducedMotion ? REDUCED_MOTION_MIN_MS : EXIT_START_MS;
    const minimumWindow = waitForSplashMinimum(startedAt, minimumMs);

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
  }, [activeProfile, beginExit, hasChosenLanguage, isReady, reducedMotion, setOllamaStatus, startedAt]);

  /* ── animations ── */
  useEffect(() => {
    if (startedAt === null || !logoLoaded || !frameHasLayout) return;

    if (reducedMotion) {
      // Reduced motion: 400ms fade only, no scale, float or sweep
      logoOpacity.value = withTiming(1, {
        duration: SPLASH_REDUCED_MOTION_FADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      });
      // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
      logoScale.value = 1;
      glowOpacity.value = withTiming(1, {
        duration: SPLASH_REDUCED_MOTION_FADE_MS,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      });
      glowScale.value = 1;
      progressOpacity.value = 1;
    } else {
      const easeOut = Easing.out(Easing.cubic);

      // 250-1250ms: logo fades from 0→1 and scales 0.92→1.0
      logoOpacity.value = withDelay(
        LOGO_FADE_START_MS,
        withTiming(1, { duration: LOGO_FADE_DURATION_MS, easing: easeOut, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );
      logoScale.value = withDelay(
        LOGO_FADE_START_MS,
        withTiming(1, { duration: LOGO_FADE_DURATION_MS, easing: easeOut, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );

      // 400-1600ms: glow fades in 0→1 and scales 0.9→1.0
      glowOpacity.value = withDelay(
        GLOW_FADE_START_MS,
        withTiming(1, { duration: GLOW_FADE_DURATION_MS, easing: easeOut, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );
      glowScale.value = withDelay(
        GLOW_FADE_START_MS,
        withTiming(1, { duration: GLOW_FADE_DURATION_MS, easing: easeOut, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );

      // 1300ms: progress line fades in over 300ms
      progressOpacity.value = withDelay(
        PROGRESS_FADE_START_MS,
        withTiming(1, { duration: PROGRESS_FADE_DURATION_MS, easing: easeOut, reduceMotion: ReduceMotion.Never }),
        ReduceMotion.Never,
      );

      // 1250-3600ms: subtle float up/down 4px
      logoFloat.value = withDelay(
        FLOAT_START_MS,
        withRepeat(
          withSequence(
            withTiming(-FLOAT_DISTANCE_PX, {
              duration: FLOAT_HALF_CYCLE_MS,
              easing: Easing.inOut(Easing.sin),
              reduceMotion: ReduceMotion.Never,
            }),
            withTiming(0, {
              duration: FLOAT_HALF_CYCLE_MS,
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
    }

    return () => {
      [logoOpacity, logoScale, logoFloat, glowOpacity, glowScale, progressOpacity].forEach(cancelAnimation);
    };
  }, [
    frameHasLayout,
    logoLoaded,
    startedAt,
    reducedMotion,
    logoOpacity,
    logoScale,
    logoFloat,
    glowOpacity,
    glowScale,
    progressOpacity,
  ]);

  /* ── hide native splash screen ── */
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

  /* ── derived styles ── */
  const width = viewportWidth || 390;
  const logoWidth = Math.min(
    SPLASH_LOGO_WIDTH_MAX,
    Math.max(SPLASH_LOGO_WIDTH_PHONE, width * SPLASH_LOGO_WIDTH_RATIO),
    width / 1.6,
  );
  const glowSize = logoWidth * 1.6;
  const glowLayers = [];
  let previousGlowAlpha = 0;
  for (let index = GLOW_STEPS; index >= 0; index -= 1) {
    const radialPosition = index / GLOW_STEPS;
    const targetAlpha = 0.7 * (1 - radialPosition) ** 2;
    const layerAlpha = (targetAlpha - previousGlowAlpha) / (1 - previousGlowAlpha);
    if (layerAlpha > 0) {
      const layerSize = glowSize * Math.max(radialPosition, 1 / GLOW_STEPS);
      glowLayers.push(
        <View
          key={index}
          style={{
            position: 'absolute',
            alignSelf: 'center',
            width: layerSize,
            height: layerSize,
            borderRadius: layerSize / 2,
            backgroundColor: splashGlow,
            opacity: layerAlpha,
          }}
        />,
      );
    }
    previousGlowAlpha = targetAlpha;
  }

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateY: logoFloat.value },
      { scale: logoScale.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));

  /* ── callbacks ── */
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

  /* ── platform-specific logo shadow ── */
  const logoShadowStyle =
    Platform.OS === 'web'
      ? ({ boxShadow: `0px 10px 30px rgba(232, 89, 12, ${LOGO_SHADOW_OPACITY})` } as const)
      : Platform.OS === 'ios'
        ? {
            shadowColor: splashLogoShadow,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: LOGO_SHADOW_OPACITY,
            shadowRadius: 30,
          }
        : {}; // skip on Android where elevation looks harsh

  return (
    <Animated.View onLayout={onFrameLayout} style={[styles.screen, screenStyle]}>
      <StatusBar style="dark" />

      {/* Accessibility: invisible live region for screen readers */}
      <Text
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
        style={styles.srOnly}
      >
        {screenReaderText}
      </Text>

      {/* Logo area: vertically at ~46% from top */}
      <View
        style={[
          styles.logoArea,
          {
            top: viewportHeight * 0.46 - logoWidth / 2,
            height: logoWidth,
          },
        ]}
      >
        {/* Radial glow behind logo */}
        <Animated.View
          style={[
            styles.glowContainer,
            { width: glowSize, height: glowSize, borderRadius: glowSize / 2 },
            glowAnimatedStyle,
          ]}
        >
          {glowLayers}
        </Animated.View>

        {/* Logo */}
        <Animated.View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Aikus"
          style={[
            styles.logo,
            { width: logoWidth, height: logoWidth },
            logoShadowStyle,
            logoAnimatedStyle,
          ]}
        >
          {hasLogo ? (
            <SplashLogoImage onLoad={onLogoLoad} onError={onLogoError} />
          ) : (
            <Text style={styles.logoFallback}>{getSplashLogoFallbackText()}</Text>
          )}
        </Animated.View>
      </View>

      {/* Progress line: 15% from bottom */}
      <View style={[styles.progressArea, { bottom: viewportHeight * 0.15 }]}>
        <ProgressLine opacity={progressOpacity} isActive={startedAt !== null} isReduced={reducedMotion} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: splashBackground,
    alignItems: 'center',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
  logoArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  logo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    color: splashText,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
  },
  progressArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressTrack: {
    width: PROGRESS_WIDTH,
    height: PROGRESS_HEIGHT,
    borderRadius: 999,
    backgroundColor: splashProgressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
    borderRadius: 999,
    backgroundColor: splashProgressFill,
  },
});
