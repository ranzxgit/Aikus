import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import AikHappy from '../../assets/mascot/aik-happy.svg';
import AikHeadOrange from '../../assets/mascot/aik-head-orange.svg';
import AikListen from '../../assets/mascot/aik-listen.svg';
import AikSleep from '../../assets/mascot/aik-sleep.svg';
import AikSmile from '../../assets/mascot/aik-smile.svg';
import AikThink from '../../assets/mascot/aik-think.svg';
import AikWave from '../../assets/mascot/aik-wave.svg';
import { getMascotMotionSettings, type MascotPose } from '@/services/mascot';

interface MascotProps {
  pose: MascotPose;
  size?: number;
  accessibilityLabel?: string;
  decorative?: boolean;
  gentleBounce?: boolean;
}

const POSE_ARTWORK = {
  happy: AikHappy,
  wave: AikWave,
  listen: AikListen,
  sleep: AikSleep,
  think: AikThink,
  smile: AikSmile,
} satisfies Record<MascotPose, typeof AikHappy>;

export function Mascot({
  pose,
  size = 96,
  accessibilityLabel = 'Aik the frog',
  decorative = false,
  gentleBounce = false,
}: MascotProps) {
  const reducedMotion = useReducedMotion();
  const { poseTransitionDuration, bounce } = getMascotMotionSettings(reducedMotion, gentleBounce);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const offsetY = useSharedValue(0);
  const bounceY = useSharedValue(0);
  const Artwork = size < 64 ? AikHeadOrange : POSE_ARTWORK[pose];

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(offsetY);

    if (poseTransitionDuration === 0) {
      opacity.value = 1;
      scale.value = 1;
      offsetY.value = 0;
      return;
    }

    opacity.value = 0;
    scale.value = 0.96;
    offsetY.value = 2;
    opacity.value = withTiming(1, { duration: poseTransitionDuration });
    scale.value = withTiming(1, { duration: poseTransitionDuration, easing: Easing.out(Easing.quad) });
    offsetY.value = withTiming(0, { duration: poseTransitionDuration, easing: Easing.out(Easing.quad) });
  }, [offsetY, opacity, pose, poseTransitionDuration, scale]);

  useEffect(() => {
    cancelAnimation(bounceY);
    bounceY.value = 0;
    if (bounce) {
      bounceY.value = withRepeat(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }
    return () => cancelAnimation(bounceY);
  }, [bounce, bounceY]);

  const mascotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: offsetY.value + bounceY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      style={[styles.container, { width: size, height: size }]}
    >
      <Animated.View style={[styles.artwork, mascotStyle]}>
        <Artwork width={size} height={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  artwork: { alignItems: 'center', justifyContent: 'center' },
});
