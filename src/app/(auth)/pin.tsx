import { colors } from '@/theme/tokens';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccessiblePressable as Pressable, LargeTitle, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { recordWrongPin } from '@/services/pinAttempts';
import { verifyProfilePin } from '@/services/profileStore';

export default function PinScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profiles, language, activateProfile } = useAppFlow();
  const text = FLOW_TEXT[language];
  const profile = profiles.find((item) => item.id === profileId);
  const [pin, setPin] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [message, setMessage] = useState('');
  const locked = lockedUntil !== null && now < lockedUntil;

  useEffect(() => {
    if (!profile) router.replace('/(auth)/login');
  }, [profile]);

  useEffect(() => {
    if (lockedUntil === null) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const dots = useMemo(() => `${'● '.repeat(pin.length)}${'○ '.repeat(4 - pin.length)}`.trim(), [pin.length]);

  const submit = async () => {
    if (!profile || pin.length !== 4 || locked) return;
    if (await verifyProfilePin(profile.id, pin)) {
      await activateProfile(profile.id);
      router.replace('/(app)/home');
      return;
    }
    const result = recordWrongPin({ wrongAttempts, lockedUntil }, Date.now());
    setWrongAttempts(result.wrongAttempts);
    setLockedUntil(result.lockedUntil);
    setMessage(result.locked ? '' : text.incorrectPin(result.remainingAttempts));
    setPin('');
  };

  const addDigit = (digit: string) => {
    if (!locked) setPin((current) => current.length < 4 ? `${current}${digit}` : current);
  };

  return (
    <Screen style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ {text.back}</Text>
        </Pressable>
        <LargeTitle style={styles.title}>{text.enterPin}</LargeTitle>
        {profile ? <Text style={styles.name}>{profile.name}</Text> : null}
        <Text accessibilityLabel={text.enterPin} style={styles.dots}>{dots}</Text>
        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => {
            const label = key === 'clear' ? (language === 'tl' ? 'I-clear' : 'Clear')
              : key === 'backspace' ? (language === 'tl' ? 'Burahin ang huli' : 'Delete last digit')
                : key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={locked}
                onPress={() => key === 'clear' ? setPin('') : key === 'backspace' ? setPin((value) => value.slice(0, -1)) : addDigit(key)}
                style={[styles.key, locked && styles.disabledKey]}
              >
                <Text style={styles.keyText}>{key === 'clear' ? 'C' : key === 'backspace' ? '⌫' : key}</Text>
              </Pressable>
            );
          })}
        </View>
        {message ? <Text accessibilityLiveRegion="assertive" style={styles.message}>{message}</Text> : null}
        {locked ? <Text accessibilityLiveRegion="polite" style={styles.message}>{text.pinLocked}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={text.continue} disabled={pin.length !== 4 || locked} onPress={() => void submit()} style={[styles.submit, (pin.length !== 4 || locked) && styles.disabledKey]}>
          <Text style={styles.submitText}>{text.continue}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={text.forgotPin} onPress={() => router.push({ pathname: '/(auth)/settings', params: { profileId } })} style={styles.forgotButton}>
          <Text style={styles.forgotText}>{text.forgotPin}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center', gap: 14, paddingVertical: 20 },
  backButton: { minHeight: 60, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#F0E3DA' },
  backText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', textAlign: 'center' },
  name: { color: colors.secondaryText, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28 },
  dots: { color: colors.text, fontSize: 24,
    fontFamily: 'Inter', lineHeight: 34, letterSpacing: 4, minHeight: 40 },
  keypad: { width: '100%', maxWidth: 360, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  key: { width: '28%', minHeight: 62, justifyContent: 'center', alignItems: 'center', borderRadius: 999, borderWidth: 2, borderColor: colors.secondaryText, backgroundColor: colors.card },
  disabledKey: { opacity: 1 },
  keyText: { color: colors.text, fontSize: 24,
    fontFamily: 'Inter', fontWeight: '700' },
  message: { width: '100%', color: colors.danger, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, textAlign: 'center' },
  submit: { width: '100%', maxWidth: 360, minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.primary },
  submitText: { color: colors.card, fontSize: 20,
    fontFamily: 'Inter', fontWeight: '800' },
  forgotButton: { minHeight: 60, justifyContent: 'center', paddingHorizontal: 16 },
  forgotText: { color: colors.accent, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, textDecorationLine: 'underline' },
});
