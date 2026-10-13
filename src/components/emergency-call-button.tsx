import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';

type EmergencyCallButtonProps = {
  language?: SupportedLanguage;
  label?: string;
};

export function EmergencyCallButton({ language = 'en', label }: EmergencyCallButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const text = CHAT_UI_TEXT[language];
  const buttonLabel = label ?? text.emergencyButtonLabel;

  const placeCall = async () => {
    try {
      setIsOpening(true);
      await Linking.openURL('tel:911');
    } catch {
      Alert.alert(text.emergencyCallError);
    } finally {
      setIsOpening(false);
    }
  };

  const confirmCall = () => {
    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm(
        `${text.emergencyConfirmationTitle}\n${text.emergencyConfirmationMessage}`,
      );
      if (confirmed) {
        void placeCall();
      }
      return;
    }

    Alert.alert(text.emergencyConfirmationTitle, text.emergencyConfirmationMessage, [
      { text: text.emergencyCancelLabel, style: 'cancel' },
      { text: text.emergencyConfirmLabel, onPress: () => void placeCall() },
    ]);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={buttonLabel}
      accessibilityHint={text.emergencyConfirmationMessage}
      disabled={isOpening}
      onPress={confirmCall}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, isOpening && styles.disabled]}
    >
      <Text style={styles.buttonText}>{buttonLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#B42318',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.65,
  },
});
