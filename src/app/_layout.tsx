import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmergencyButton } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { AppFlowProvider, useAppFlow } from '@/providers/app-flow-provider';
import { getFlowRedirect } from '@/services/flowRedirect';
import { colors, spacing, splashBackground } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
if (
  Platform.OS === 'ios' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
) {
  SplashScreen.setOptions({ duration: 350, fade: true });
}

function NavigationRoot({ fontsReady }: { fontsReady: boolean }) {
  const segments = useSegments();
  const reducedMotion = useReducedMotion();
  const { isReady, activeProfile, language, hasChosenLanguage } = useAppFlow();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const width = viewportWidth || 390;
  const routeSegments = segments as readonly string[];
  const isSplashRoute = routeSegments.length === 0 || routeSegments[0] === 'index';

  useEffect(() => {
    if (Platform.OS === 'android') {
      void SystemUI.setBackgroundColorAsync(isSplashRoute ? splashBackground : colors.background).catch(() => undefined);
    }
  }, [isSplashRoute]);

  useEffect(() => {
    if (!isReady) return;
    const redirect = getFlowRedirect(Boolean(activeProfile), segments, hasChosenLanguage);
    if (redirect) router.replace(redirect as never);
  }, [isReady, activeProfile, segments, hasChosenLanguage]);

  return (
    <View style={[styles.container, isSplashRoute && styles.splashContainer]}>
      <StatusBar style={isSplashRoute ? 'light' : 'dark'} />
      {fontsReady ? (
        <>
          <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isSplashRoute ? splashBackground : colors.background },
            animation: reducedMotion ? 'none' : 'fade',
          }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
          {!isSplashRoute ? (
            <View style={[styles.emergencyDock, { width: Math.max(0, width - 32), paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
              <EmergencyButton language={language} label={FLOW_TEXT[language].callNow} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter: require('../theme/Inter.ttf') });
  return (
    <SafeAreaProvider>
      <AppFlowProvider>
        <NavigationRoot fontsReady={fontsLoaded || fontError !== null} />
      </AppFlowProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  splashContainer: { backgroundColor: splashBackground },
  emergencyDock: { alignSelf: 'center', alignItems: 'stretch', paddingTop: 8, backgroundColor: colors.background },
});
