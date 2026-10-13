import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccessiblePressable as Pressable, IconButton, LargeTitle, PrimaryButton, Screen, SecondaryButton, Subtitle, TextButton } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { HOSPITAL_TEXT } from '@/constants/hospitalCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { isOllamaReachable } from '@/services/ollamaHealth';

export default function HomeScreen() {
  const { activeProfile, language, ollamaReachable, setOllamaStatus, logOut } = useAppFlow();
  const text = FLOW_TEXT[language];
  const hospitalText = HOSPITAL_TEXT[language];
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const retry = async () => {
    setChecking(true);
    const reachable = await isOllamaReachable(3000);
    setOllamaStatus(reachable);
    setDismissed(false);
    setChecking(false);
  };

  const switchProfile = async () => {
    await logOut();
    router.replace('/(auth)/login');
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.homeTopRow}><Text style={styles.brand}>AIKUS</Text><IconButton label={text.settings} onPress={() => router.push('/(app)/settings')} icon={'\u2699'} style={styles.gear} /></View>
        <LargeTitle style={styles.title}>{hospitalText.homeTitle}</LargeTitle>
        <Subtitle style={styles.subtitle}>{hospitalText.homeSubtitle}</Subtitle>
        {activeProfile ? <Text style={styles.profileName}>{activeProfile.name}</Text> : null}

        {ollamaReachable === false && !dismissed ? (
          <View accessibilityLiveRegion="polite" style={styles.notice}>
            <Text style={styles.noticeText}>{text.ollamaUnavailable}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={text.dismiss} onPress={() => setDismissed(true)} style={styles.dismissButton}>
              <Text style={styles.dismissText}>{text.dismiss}</Text>
            </Pressable>
          </View>
        ) : null}
        {ollamaReachable !== true ? (
          <Pressable accessibilityRole="button" accessibilityLabel={text.ollamaRetry} onPress={() => void retry()} disabled={checking} style={styles.retryButton}>
            <Text style={styles.retryText}>{text.ollamaRetry}</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label={hospitalText.talkToAikus} onPress={() => router.push('/(app)/chat')} style={[styles.actionButton, styles.chatButton]}>
            <View accessibilityElementsHidden style={styles.chatBubble}><View style={styles.chatDot} /><View style={styles.chatDot} /><View style={styles.chatDot} /></View>
            <View style={styles.cardCopy}><Text style={styles.primaryButtonText}>{hospitalText.talkToAikus}</Text><Text style={styles.cardDescription}>{language === 'tl' ? 'Magkuwentuhan tayo nang kaunti.' : 'Let’s have a gentle conversation.'}</Text></View>
          </PrimaryButton>
          <SecondaryButton label={hospitalText.nearestHospital} onPress={() => router.push('/(app)/hospitals')} style={[styles.actionButton, styles.hospitalButton]}>
            <View accessibilityElementsHidden style={[styles.locationIcon, styles.hospitalIcon]}><Text style={styles.plusIcon}>+</Text></View>
            <View style={styles.cardCopy}><Text style={styles.secondaryButtonText}>{hospitalText.nearestHospital}</Text><Text style={[styles.cardDescription, styles.darkDescription]}>{language === 'tl' ? 'Tingnan ang mga ospital malapit sa inyo.' : 'See hospitals close to you.'}</Text></View>
          </SecondaryButton>
        </View>

        <View style={styles.bottomActions}>
          <TextButton label={text.changeProfile} onPress={() => void switchProfile()} style={styles.textButton}>
            <Text style={styles.linkText}>{text.changeProfile}</Text>
          </TextButton>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 720, alignSelf: 'center', justifyContent: 'center', gap: 16, paddingVertical: 24 },
  brand: { color: colors.text, fontSize: 22,
    fontFamily: 'Inter', fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  homeTopRow: { minHeight: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gear: { backgroundColor: colors.card },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.secondaryText, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 29, textAlign: 'center' },
  profileName: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  notice: { backgroundColor: '#F0E3DA', borderWidth: 1, borderColor: colors.secondaryText, borderRadius: 14, padding: 14, gap: 8 },
  noticeText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26 },
  dismissButton: { minHeight: 60, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 999 },
  dismissText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700', textDecorationLine: 'underline' },
  retryButton: { minHeight: 60, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 999 },
  retryText: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700', textDecorationLine: 'underline' },
  actions: { gap: 14, marginTop: 4 },
  actionButton: { minHeight: 104, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 18, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 0 },
  chatButton: { backgroundColor: colors.primary },
  hospitalButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chatBubble: { width: 44, height: 34, borderRadius: 12, backgroundColor: colors.card, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  chatDot: { width: 5, height: 5, borderRadius: 999, backgroundColor: colors.primary },
  locationIcon: { width: 44, height: 44, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  hospitalIcon: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  plusIcon: { color: colors.primary, fontSize: 26, fontFamily: 'Inter', fontWeight: '700', lineHeight: 30 },
  cardCopy: { flex: 1, gap: 4 },
  cardDescription: { color: colors.card, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 25 },
  darkDescription: { color: colors.secondaryText },
  primaryButtonText: { color: colors.card, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '800', textAlign: 'left' },
  secondaryButtonText: { color: colors.text, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '800', textAlign: 'left' },
  bottomActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 2 },
  textButton: { minHeight: 60, justifyContent: 'center', paddingHorizontal: 8 },
  linkText: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 25, fontWeight: '700', textDecorationLine: 'underline' },
});
