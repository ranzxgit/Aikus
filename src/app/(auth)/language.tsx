import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { LargeTitle, PrimaryButton, Screen, SecondaryButton, Subtitle } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import type { SupportedLanguage } from '@/config';

export default function LanguageChoiceScreen() {
  const { language, changeLanguage } = useAppFlow();
  const text = FLOW_TEXT[language];

  const choose = async (selected: SupportedLanguage) => {
    await changeLanguage(selected);
    router.replace('/(auth)/login');
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>AIKUS</Text>
        <LargeTitle style={styles.title}>{text.languageTitle}</LargeTitle>
        <Subtitle style={styles.body}>{text.languagePrompt}</Subtitle>
        <View style={styles.actions}>
          <PrimaryButton label="English" onPress={() => void choose('en')}><Text style={styles.buttonText}>English</Text></PrimaryButton>
          <SecondaryButton label="Tagalog" onPress={() => void choose('tl')}><Text style={styles.secondaryText}>Tagalog</Text></SecondaryButton>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 650, alignSelf: 'center', justifyContent: 'center', gap: 22, paddingVertical: 24 },
  brand: { color: colors.text, fontSize: 22,
    fontFamily: 'Inter', fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.secondaryText, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 27, textAlign: 'center' },
  actions: { gap: 16, marginTop: 8 },
  button: { minHeight: 68, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: colors.primary, paddingHorizontal: 20 },
  buttonText: { color: colors.card, fontSize: 21,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '800' },
  secondaryText: { color: colors.primary, fontSize: 21,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '700' },
});
