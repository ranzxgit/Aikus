import { colors } from '@/theme/tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccessiblePressable as Pressable, LargeTitle, Screen } from '@/components/ui';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { createProfile } from '@/services/profileStore';

export default function AddProfileScreen() {
  const { language, refreshProfiles } = useAppFlow();
  const text = FLOW_TEXT[language];
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [skipPin, setSkipPin] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError(text.profileNameRequired);
      return;
    }
    if (!skipPin && pin.length > 0 && !/^\d{4}$/.test(pin)) {
      setError(language === 'tl' ? 'Gumamit ng eksaktong 4 na digit o piliin ang Laktawan ang PIN.' : 'Use exactly 4 digits or choose Skip PIN.');
      return;
    }
    setSaving(true);
    try {
      const profile = await createProfile(name, language, !skipPin && pin ? pin : undefined);
      await refreshProfiles();
      router.replace({ pathname: '/(auth)/login', params: { selectedId: profile.id } });
    } catch {
      setError(language === 'tl' ? 'Hindi na-save ang profile. Subukan muli.' : 'The profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable accessibilityRole="button" accessibilityLabel={text.back} onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>‹ {text.back}</Text>
          </Pressable>
          <LargeTitle style={styles.title}>{text.addProfile}</LargeTitle>
          <Text style={styles.label}>{text.profileName}</Text>
          <TextInput
            accessibilityLabel={text.profileName}
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoCapitalize="words"
            style={styles.input}
            returnKeyType="next"
          />
          <Text style={styles.label}>{text.pin}</Text>
          <TextInput
            accessibilityLabel={text.pin}
            value={pin}
            onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            editable={!skipPin}
            style={[styles.input, skipPin && styles.disabledInput]}
          />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: skipPin }} accessibilityLabel={text.skipPin} onPress={() => { setSkipPin((value) => !value); setPin(''); }} style={styles.skipRow}>
            <View style={[styles.checkbox, skipPin && styles.checked]}><Text style={styles.checkMark}>{skipPin ? '✓' : ''}</Text></View>
            <Text style={styles.skipText}>{text.skipPin}</Text>
          </Pressable>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={text.saveProfile} disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.disabledButton]}>
            <Text style={styles.saveText}>{text.saveProfile}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', justifyContent: 'center', gap: 14, paddingVertical: 24 },
  backButton: { minHeight: 60, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 999, backgroundColor: '#F0E3DA' },
  backText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '700' },
  title: { color: colors.text, fontSize: 34,
    fontFamily: 'Inter', lineHeight: 42, fontWeight: '800', marginBottom: 4 },
  label: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 26, fontWeight: '700' },
  input: { minHeight: 60, borderWidth: 2, borderColor: colors.secondaryText, borderRadius: 12, backgroundColor: colors.card, paddingHorizontal: 14, color: colors.text, fontSize: 20, fontFamily: 'Inter' },
  disabledInput: { backgroundColor: '#E7DFDA', color: colors.text },
  skipRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderWidth: 2, borderColor: colors.primary, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.primary },
  checkMark: { color: colors.card, fontSize: 18,
    fontFamily: 'Inter', fontWeight: '900' },
  skipText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 25 },
  error: { color: colors.danger, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 25 },
  saveButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 999, backgroundColor: colors.primary, marginTop: 8 },
  disabledButton: { opacity: 0.7 },
  saveText: { color: colors.card, fontSize: 20,
    fontFamily: 'Inter', lineHeight: 28, fontWeight: '800' },
});
