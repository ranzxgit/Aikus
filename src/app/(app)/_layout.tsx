import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

export default function AppLayout() {
  const reducedMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'fade' }} />;
}
