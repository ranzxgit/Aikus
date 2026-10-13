import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmergencyButton } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { AppFlowProvider, useAppFlow } from '@/providers/app-flow-provider';
import { getFlowRedirect } from '@/services/flowRedirect';
import { colors, spacing } from '@/theme/tokens';

function NavigationRoot() {
  const segments = useSegments();
  const reducedMotion = useReducedMotion();
  const { isReady, activeProfile, language, hasChosenLanguage } = useAppFlow();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const width = viewportWidth || 390;

  useEffect(() => {
    if (!isReady) return;
    const redirect = getFlowRedirect(Boolean(activeProfile), segments, hasChosenLanguage);
    if (redirect) router.replace(redirect as never);
  }, [isReady, activeProfile, segments, hasChosenLanguage]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reducedMotion ? 'none' : 'fade',
      }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <View style={[styles.emergencyDock, { width: Math.max(0, width - 32), paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        <EmergencyButton language={language} label={FLOW_TEXT[language].callNow} />
      </View>
    </View>
  );
}

export default function RootLayout() {
  useFonts({ Inter: require('../theme/Inter.ttf') });
  return (
    <SafeAreaProvider>
      <AppFlowProvider>
        <NavigationRoot />
      </AppFlowProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emergencyDock: { alignSelf: 'center', alignItems: 'stretch', paddingTop: 8, backgroundColor: colors.background },
});
