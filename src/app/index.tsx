import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageToggle } from '@/components/language-toggle';
import { HOSPITAL_TEXT } from '@/constants/hospitalCopy';
import { useLanguageSetting } from '@/hooks/use-language-setting';

export default function HomeScreen() {
  const { language, changeLanguage } = useLanguageSetting();
  const text = HOSPITAL_TEXT[language];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>AIKUS</Text>
        <Text accessibilityRole="header" style={styles.title}>{text.homeTitle}</Text>
        <Text style={styles.subtitle}>{text.homeSubtitle}</Text>
        <LanguageToggle language={language} onChange={changeLanguage} />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.talkToAikus}
            onPress={() => router.push('/login')}
            style={[styles.actionButton, styles.chatButton]}
          >
            <Text style={styles.primaryButtonText}>{text.talkToAikus}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.nearestHospital}
            onPress={() => router.push('/hospitals')}
            style={[styles.actionButton, styles.hospitalButton]}
          >
            <Text style={styles.secondaryButtonText}>{text.nearestHospital}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9F4' },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  brand: { color: '#32251F', fontSize: 22, fontWeight: '900', letterSpacing: 4, textAlign: 'center' },
  title: { color: '#32251F', fontSize: 32, lineHeight: 40, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#49382F', fontSize: 20, lineHeight: 30, textAlign: 'center' },
  actions: { gap: 16, marginTop: 8 },
  actionButton: {
    minHeight: 72,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 20,
  },
  chatButton: { backgroundColor: '#56301F' },
  hospitalButton: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#56301F' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  secondaryButtonText: { color: '#32251F', fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
});
