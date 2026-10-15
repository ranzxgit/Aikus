import { accent, ink, inkSecondary, languageBackground } from '@/theme/tokens';
import { router } from 'expo-router';
import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, Vibration, useWindowDimensions, type PressableProps } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppFlow } from '@/providers/app-flow-provider';
import type { SupportedLanguage } from '@/config';

const KeyboardPressable = Pressable as ComponentType<PressableProps & {
  onKeyDown?: (event: { nativeEvent: { key: string } }) => void;
}>;

export default function LanguageChoiceScreen() {
  const { language, changeLanguage } = useAppFlow();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language ?? 'en');
  const [displayLanguage, setDisplayLanguage] = useState<SupportedLanguage>(language ?? 'en');
  const [focusedLanguage, setFocusedLanguage] = useState<SupportedLanguage | null>(null);
  const [continueFocused, setContinueFocused] = useState(false);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const textOpacity = useSharedValue(1);
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  const updateDisplayedLanguage = useCallback((next: SupportedLanguage) => {
    setDisplayLanguage(next);
  }, []);

  useEffect(() => {
    if (displayLanguage !== selectedLanguage && !reducedMotion) {
      textOpacity.value = withTiming(1, { duration: 75 });
    }
  }, [displayLanguage, reducedMotion, selectedLanguage, textOpacity]);

  const copy = displayLanguage === 'tl'
    ? { title: 'Piliin ang wika', subtitle: 'Piliin ang wikang mas komportable kayo.', helper: 'Maaari ninyo itong baguhin sa Settings.', continue: 'Magpatuloy' }
    : { title: 'Choose your language', subtitle: 'Choose the language that feels most comfortable.', helper: 'You can change this in Settings.', continue: 'Continue' };

  const selectLanguage = (next: SupportedLanguage) => {
    if (next === selectedLanguage) return;
    setSelectedLanguage(next);
    if (reducedMotion) {
      setDisplayLanguage(next);
      return;
    }
    textOpacity.value = withTiming(0, { duration: 75 }, (finished) => {
      if (finished) runOnJS(updateDisplayedLanguage)(next);
    });
  };

  const choose = async (selected: SupportedLanguage) => {
    await changeLanguage(selected);
    router.replace('/(auth)/login');
  };

  const handleRowKeyDown = (key: string, current: SupportedLanguage) => {
    if (key === 'ArrowDown' || key === 'ArrowRight') {
      selectLanguage(current === 'en' ? 'tl' : 'en');
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      selectLanguage(current === 'tl' ? 'en' : 'tl');
    } else if (key === 'Enter' || key === ' ') {
      selectLanguage(current);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { minHeight: Math.max(0, windowHeight - insets.top - insets.bottom), paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.column}>
          <Animated.View style={textStyle}>
            <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
          </Animated.View>

          <View accessibilityRole="radiogroup" accessibilityLabel={displayLanguage === 'tl' ? 'Piliin ang wika' : 'Choose your language'} style={styles.options}>
            {(['en', 'tl'] as const).map((value) => {
              const selected = selectedLanguage === value;
              const label = value === 'en' ? 'English' : 'Tagalog';
              return <KeyboardPressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${label}, ${selected ? 'selected' : 'not selected'}`}
                accessibilityState={{ selected }}
                onPress={() => { if (Platform.OS !== 'web') Vibration.vibrate(8); selectLanguage(value); }}
                onKeyDown={({ nativeEvent }: { nativeEvent: { key: string } }) => handleRowKeyDown(nativeEvent.key, value)}
                onFocus={() => setFocusedLanguage(value)}
                onBlur={() => setFocusedLanguage((focused) => focused === value ? null : focused)}
                style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && !selected && styles.optionPressed, Platform.OS === 'web' && focusedLanguage === value && styles.focusRing]}
              >
                <Text style={styles.optionLabel}>{label}</Text>
                {selected ? <Text accessibilityElementsHidden style={styles.checkmark}>✓</Text> : null}
              </KeyboardPressable>;
            })}
          </View>
        </View>

        <View style={styles.column}>
          <Animated.View style={textStyle}>
            <Text style={styles.helper}>{copy.helper}</Text>
          </Animated.View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.continue}
            onPress={() => { if (Platform.OS !== 'web') Vibration.vibrate(8); void choose(selectedLanguage); }}
            onFocus={() => setContinueFocused(true)}
            onBlur={() => setContinueFocused(false)}
            style={({ pressed }) => [styles.continue, pressed && styles.continuePressed, Platform.OS === 'web' && continueFocused && styles.focusRing]}
          >
            <Animated.Text style={[styles.continueText, textStyle]}>{copy.continue}</Animated.Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: languageBackground },
  content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 24, justifyContent: 'space-between', boxSizing: 'border-box' },
  column: { width: '100%' },
  title: { color: ink, fontSize: 34, lineHeight: 40, fontWeight: '700', textAlign: 'left', flexShrink: 1 },
  subtitle: { color: inkSecondary, fontSize: 18, lineHeight: 26, fontWeight: '400', marginTop: 12, textAlign: 'left' },
  options: { gap: 12, marginTop: 32 },
  option: { minHeight: 64, height: 64, width: '100%', borderRadius: 28, borderWidth: 1.5, borderColor: 'transparent', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { borderColor: accent },
  optionPressed: { backgroundColor: 'rgba(255,255,255,0.4)' },
  optionLabel: { color: ink, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  checkmark: { color: accent, fontSize: 22, lineHeight: 26, fontWeight: '500', width: 24, textAlign: 'center' },
  helper: { color: inkSecondary, fontSize: 16, lineHeight: 24, marginBottom: 12, textAlign: 'left' },
  continue: { minHeight: 60, width: '100%', borderRadius: 999, backgroundColor: accent, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 20 },
  continuePressed: { opacity: 0.88 },
  continueText: { color: '#FFFFFF', fontSize: 20, lineHeight: 28, fontWeight: '700' },
  focusRing: { outlineStyle: 'solid', outlineWidth: 3, outlineColor: ink, outlineOffset: 2 },
});
