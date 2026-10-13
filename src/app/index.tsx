import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AikusAvatar } from '@/components/aikus-avatar';
import { LargeTitle, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { isOllamaReachable } from '@/services/ollamaHealth';
import { getProfiles, setOllamaReachable } from '@/services/profileStore';

export default function LoadingScreen() {
  const { isReady, hasChosenLanguage, activeProfile, language, setOllamaStatus } = useAppFlow();
  const text = FLOW_TEXT[language];

  useEffect(() => {
    if (!isReady) return;
    let active = true;

    void (async () => {
      const [reachable, profiles] = await Promise.all([
        isOllamaReachable(3000),
        getProfiles().catch(() => []),
      ]);
      await setOllamaReachable(reachable).catch(() => undefined);
      if (!active) return;
      setOllamaStatus(reachable);
      if (activeProfile && profiles.some((profile) => profile.id === activeProfile.id)) {
        router.replace('/(app)/home');
      } else if (!hasChosenLanguage) {
        router.replace('/(auth)/language');
      } else {
        router.replace('/(auth)/login');
      }
    })();

    return () => {
      active = false;
    };
  }, [isReady, hasChosenLanguage, activeProfile, setOllamaStatus]);

  return (
    <Screen style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.avatarScale}><AikusAvatar state="idle" language={language} /></View>
        <LargeTitle style={styles.title}>{text.waking}</LargeTitle>
        <Text style={styles.tagalog}>{FLOW_TEXT.tl.waking}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 24 },
  avatarScale: { transform: [{ scale: 1.125 }] },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', textAlign: 'center' },
  tagalog: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, textAlign: 'center' },
});
