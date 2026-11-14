import { useEffect } from 'react';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';

import type { SupportedLanguage } from '@/config';
import type { AvatarState } from '@/services/avatarState';

interface AikusAvatarProps {
  state: AvatarState;
  language: SupportedLanguage;
  size?: number;
  showName?: boolean;
}

const STATE_LABELS: Record<SupportedLanguage, Record<AvatarState, string>> = {
  en: {
    idle: 'Aikus is listening',
    thinking: 'Aikus is thinking',
    speaking: 'Aikus is speaking',
  },
  tl: {
    idle: 'Nakikinig si Aikus',
    thinking: 'Nag-iisip si Aikus',
    speaking: 'Nagsasalita si Aikus',
  },
};

/**
 * The state-driven wrapper keeps the chat independent from the avatar artwork,
 * so the face can later be replaced with a Lottie animation.
 */
export function AikusAvatar({ state, language, size = 76, showName = true }: AikusAvatarProps) {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const pulse = useSharedValue(0.55);
  const mouth = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(float);
    cancelAnimation(blink);
    cancelAnimation(pulse);
    cancelAnimation(mouth);
    float.value = 0;
    blink.value = 1;
    pulse.value = 0.55;
    mouth.value = 0;

    if (reducedMotion) {
      return () => {
        cancelAnimation(float);
        cancelAnimation(blink);
        cancelAnimation(pulse);
        cancelAnimation(mouth);
      };
    }

    if (state === 'idle') {
      float.value = withRepeat(
        withTiming(-3, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      blink.value = withRepeat(
        withSequence(
          withDelay(3200, withTiming(0.08, { duration: 170 })),
          withTiming(1, { duration: 190 }),
        ),
        -1,
        false,
      );
    } else if (state === 'thinking') {
      pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      mouth.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
    }

    return () => {
      cancelAnimation(float);
      cancelAnimation(blink);
      cancelAnimation(pulse);
      cancelAnimation(mouth);
    };
  }, [blink, float, mouth, pulse, reducedMotion, state]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const eyesStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: interpolate(pulse.value, [0.55, 1], [0.9, 1.08]) }],
  }));
  const mouthStyle = useAnimatedStyle(() => ({
    height: interpolate(mouth.value, [0, 1], [5, 12]),
  }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={STATE_LABELS[language][state]} style={[styles.container, size !== 76 && { width: size, height: size, transform: [{ scale: size / 76 }] }]}>
      <Animated.View style={[styles.face, floatStyle]}>
        <View style={styles.earLeft} />
        <View style={styles.earRight} />
        <View style={[styles.eyeRow, state === 'thinking' && styles.eyesLookingUp]}>
          <Animated.View style={[styles.eyePair, eyesStyle]}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </Animated.View>
        </View>
        <Animated.View
          style={[
            styles.mouth,
            state === 'speaking' ? styles.openMouth : styles.smile,
            mouthStyle,
          ]}
        />
      </Animated.View>
      {state === 'thinking' ? (
        <View style={styles.thinkingDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {[0, 1, 2].map((dot) => (
            <Animated.View key={dot} style={[styles.thinkingDot, dotStyle]} />
          ))}
        </View>
      ) : null}
      {showName ? <Text style={styles.caption}>Aikus</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  face: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EFAE70',
    borderWidth: 2,
    borderColor: '#915B3D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  earLeft: {
    position: 'absolute',
    left: -7,
    top: 29,
    width: 14,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFAE70',
    borderWidth: 2,
    borderColor: '#915B3D',
    zIndex: -1,
  },
  earRight: {
    position: 'absolute',
    right: -7,
    top: 29,
    width: 14,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EFAE70',
    borderWidth: 2,
    borderColor: '#915B3D',
    zIndex: -1,
  },
  eyeRow: {
    transform: [{ translateY: -3 }],
  },
  eyesLookingUp: {
    transform: [{ translateY: -6 }],
  },
  eyePair: {
    width: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eye: {
    width: 7,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#382820',
  },
  mouth: {
    width: 19,
    marginTop: 8,
  },
  smile: {
    borderBottomWidth: 3,
    borderBottomColor: '#713F31',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  openMouth: {
    width: 14,
    borderRadius: 8,
    backgroundColor: '#713F31',
  },
  thinkingDots: {
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  thinkingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#704B3B',
  },
  caption: {
    color: '#382820',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
});
