import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';

type LanguageToggleProps = {
  language: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
};

export function LanguageToggle({ language, onChange }: LanguageToggleProps) {
  return (
    <View style={styles.row}>
      {(['en', 'tl'] as const).map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityLabel={CHAT_UI_TEXT[option].label}
          accessibilityState={{ selected: language === option }}
          onPress={() => onChange(option)}
          style={[styles.button, language === option && styles.activeButton]}
        >
          <Text style={[styles.buttonText, language === option && styles.activeButtonText]}>
            {CHAT_UI_TEXT[option].label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, width: '100%' },
  button: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#785E50',
    backgroundColor: '#FFFFFF',
  },
  activeButton: { backgroundColor: '#56301F', borderColor: '#56301F' },
  buttonText: { color: '#32251F', fontSize: 18, fontWeight: '700' },
  activeButtonText: { color: '#FFFFFF' },
});
