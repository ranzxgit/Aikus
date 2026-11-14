import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccessiblePressable } from '@/components/ui';
import { useAppFlow } from '@/providers/app-flow-provider';
import { recordWrongPin } from '@/services/pinAttempts';
import { verifyProfilePin } from '@/services/profileStore';
import { fontFamily, profileScreenColors } from '@/theme/tokens';

const PIN_LENGTH = 4;
const DOT_SIZE = 20;
const DOT_GAP = 20;
const KEY_GAP = 16;
const KEY_SIZE_MAX = 88;
const KEY_SIZE_PHONE = 84;

function PinDot({ filled, reducedMotion }: { filled: boolean; reducedMotion: boolean }) {
  const fill = useSharedValue(filled ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      fill.value = filled ? 1 : 0;
      scale.value = 1;
      return;
    }
    fill.value = withTiming(filled ? 1 : 0, { duration: 80, reduceMotion: ReduceMotion.Never });
    if (filled) {
      scale.value = withSequence(
        withTiming(1.15, { duration: 40, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never }),
        withTiming(1, { duration: 40, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
      );
    } else {
      scale.value = withTiming(1, { duration: 80, reduceMotion: ReduceMotion.Never });
    }
  }, [fill, filled, reducedMotion, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      fill.value,
      [0, 1],
      [profileScreenColors.background, profileScreenColors.ink],
    ),
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.pinDot, fillStyle]} />;
}

export default function PinScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profiles, language, activateProfile } = useAppFlow();
  const profile = profiles.find((item) => item.id === profileId);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const isTagalog = language === 'tl';
  const [pin, setPin] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shakeCount, setShakeCount] = useState(0);
  const submittingRef = useRef(false);
  const shakeX = useSharedValue(0);
  const locked = lockedUntil !== null && now < lockedUntil;
  const canSkipPin = profile !== undefined && !profile.hasPin;

  const copy = isTagalog
    ? {
        back: 'Bumalik',
        title: 'Ilagay ang PIN ninyo',
        subtitle: 'Pinoprotektahan ng apat na numerong PIN ang inyong mga usapan.',
        delete: 'Burahin',
        skip: 'Laktawan ang PIN',
        wrong: 'Hindi tama ang PIN. Subukan ulit.',
        locked: (seconds: number) => `Masyado nang maraming pagsubok. Subukan muli pagkalipas ng ${seconds} segundo.`,
        checkError: 'Hindi masuri ang PIN. Subukan ulit.',
      }
    : {
        back: 'Back',
        title: 'Enter your PIN',
        subtitle: 'Your four-number PIN keeps your chats private.',
        delete: 'Delete',
        skip: 'Skip PIN',
        wrong: 'That PIN is not right. Please try again.',
        locked: (seconds: number) => `Too many tries. Try again in ${seconds} seconds.`,
        checkError: 'We could not check your PIN. Please try again.',
      };

  useEffect(() => {
    if (!profile) router.replace('/(auth)/login');
  }, [profile]);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (timestamp >= lockedUntil) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  useEffect(() => {
    if (!shakeCount || reducedMotion) return;
    shakeX.value = withSequence(
      withTiming(-8, { duration: 70, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      withTiming(8, { duration: 70, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      withTiming(-6, { duration: 70, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      withTiming(6, { duration: 70, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
      withTiming(0, { duration: 70, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never }),
    );
    return () => cancelAnimation(shakeX);
  }, [reducedMotion, shakeCount, shakeX]);

  useEffect(() => () => cancelAnimation(shakeX), [shakeX]);

  const submit = useCallback(async (enteredPin: string) => {
    if (!profile || enteredPin.length !== PIN_LENGTH || locked || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setMessage('');
    try {
      if (await verifyProfilePin(profile.id, enteredPin)) {
        await activateProfile(profile.id);
        router.replace('/(app)/home');
        return;
      }
      const result = recordWrongPin({ wrongAttempts, lockedUntil }, Date.now());
      setWrongAttempts(result.wrongAttempts);
      setLockedUntil(result.lockedUntil);
      setNow(Date.now());
      setMessage(result.locked ? '' : copy.wrong);
      setPin('');
      setShakeCount((count) => count + 1);
    } catch {
      setMessage(copy.checkError);
      setPin('');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [activateProfile, copy.checkError, copy.wrong, locked, lockedUntil, profile, wrongAttempts]);

  const addDigit = useCallback((digit: string) => {
    if (locked || submittingRef.current) return;
    setMessage('');
    setPin((current) => current.length < PIN_LENGTH ? `${current}${digit}` : current);
  }, [locked]);

  const deleteDigit = useCallback(() => {
    if (locked || submittingRef.current) return;
    setMessage('');
    setPin((current) => current.slice(0, -1));
  }, [locked]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const timer = setTimeout(() => void submit(pin), 0);
    return () => clearTimeout(timer);
  }, [pin, submit]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        addDigit(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        deleteDigit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addDigit, deleteDigit]);

  const dotsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reducedMotion ? 0 : shakeX.value }],
  }));
  const digitAnnouncement = useMemo(
    () => isTagalog
      ? `${pin.length} sa ${PIN_LENGTH} na numero ang nailagay`
      : `${pin.length} of ${PIN_LENGTH} digits entered`,
    [isTagalog, pin.length],
  );
  const availableWidth = Math.min(viewportWidth || 390, 480) - 48;
  const preferredKeySize = (viewportWidth || 390) >= 600 ? KEY_SIZE_MAX : KEY_SIZE_PHONE;
  const keySize = Math.max(0, Math.min(preferredKeySize, (availableWidth - KEY_GAP * 2) / 3));
  const keypadWidth = keySize * 3 + KEY_GAP * 2;
  const remainingLockSeconds = lockedUntil === null ? 0 : Math.max(1, Math.ceil((lockedUntil - now) / 1_000));
  const displayedMessage = locked ? copy.locked(remainingLockSeconds) : message;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', null, '0', 'delete'] as const;

  const skipPin = async () => {
    if (!profile || !canSkipPin) return;
    await activateProfile(profile.id);
    router.replace('/(app)/home');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.frame, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            onPress={() => router.replace('/(auth)/login')}
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="arrow-back" size={24} color={profileScreenColors.ink} accessibilityElementsHidden />
            <Text style={styles.backText}>{copy.back}</Text>
          </AccessiblePressable>

          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </View>

          <Animated.View
            style={[styles.dots, dotsStyle]}
            accessibilityRole="text"
            accessibilityLabel={digitAnnouncement}
            accessibilityLiveRegion="polite"
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <PinDot key={index} filled={index < pin.length} reducedMotion={reducedMotion} />
            ))}
          </Animated.View>

          {displayedMessage ? (
            <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.message}>
              {displayedMessage}
            </Text>
          ) : null}

          <View style={[styles.keypad, { width: keypadWidth, gap: KEY_GAP }]}>
            {keys.map((key, index) => key === null ? (
              <View key={`empty-${index}`} style={{ width: keySize, height: keySize }} />
            ) : (
              <AccessiblePressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'delete' ? copy.delete : key}
                disabled={locked || submitting}
                pressedScale={0.96}
                onPress={key === 'delete' ? deleteDigit : () => addDigit(key)}
                style={({ pressed }) => [
                  styles.key,
                  { width: keySize, height: keySize, borderRadius: 24 },
                  pressed && styles.keyPressed,
                  (locked || submitting) && styles.keyDisabled,
                ]}
              >
                {key === 'delete' ? (
                  <View style={styles.deleteContent}>
                    <Ionicons name="backspace-outline" size={28} color={profileScreenColors.ink} accessibilityElementsHidden />
                    <Text style={styles.deleteText}>{copy.delete}</Text>
                  </View>
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </AccessiblePressable>
            ))}
          </View>
        </ScrollView>

        {canSkipPin ? (
          <AccessiblePressable
            accessibilityRole="button"
            accessibilityLabel={copy.skip}
            onPress={() => void skipPin()}
            style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.skipText}>{copy.skip}</Text>
          </AccessiblePressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: profileScreenColors.background },
  frame: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 8, paddingBottom: 24 },
  backButton: { minHeight: 56, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingHorizontal: 8 },
  backText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  heading: { marginTop: 32 },
  title: { color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  subtitle: { marginTop: 12, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  dots: { minHeight: DOT_SIZE, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: DOT_GAP, marginTop: 40 },
  pinDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 2, borderColor: profileScreenColors.ink },
  message: { marginTop: 12, color: profileScreenColors.secondaryText, fontFamily, fontSize: 18, lineHeight: 26 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'flex-start', alignSelf: 'center', marginTop: 40 },
  key: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: profileScreenColors.keyBorder, backgroundColor: profileScreenColors.key },
  keyPressed: { backgroundColor: profileScreenColors.keyPressed },
  keyDisabled: { opacity: 0.72 },
  keyText: { color: profileScreenColors.ink, fontFamily, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  deleteContent: { alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: profileScreenColors.ink, fontFamily, fontSize: 16, lineHeight: 20 },
  skipButton: { minHeight: 56, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 16 },
  skipText: { color: profileScreenColors.ink, fontFamily, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  buttonPressed: { backgroundColor: profileScreenColors.rowPressed },
});
