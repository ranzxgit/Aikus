import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, Vibration, useWindowDimensions, type PressableProps, type PressableStateCallbackType } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';
import { colors, radius, softShadow, spacing, typeScale } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AccessiblePressable({ style, onPress, onPressIn, onPressOut, onFocus, onBlur, children, ...props }: PressableProps) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
  useEffect(() => { scale.value = withTiming(!reduced && pressed ? 0.98 : 1, { duration: 120 }); }, [pressed, reduced, scale]);
  const focusStyle = focused && Platform.OS === 'web' ? styles.webFocus : null;
  const mergedStyle = typeof style === 'function'
    ? (state: PressableStateCallbackType) => style(state) ? [style(state), focusStyle, animatedStyle] : [focusStyle, animatedStyle]
    : [style, focusStyle, animatedStyle];
  return <AnimatedPressable {...props} style={mergedStyle as never}
    onFocus={(event) => { setFocused(true); onFocus?.(event); }}
    onBlur={(event) => { setFocused(false); onBlur?.(event); }}
    onPressIn={(event) => { setPressed(true); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); onPressOut?.(event); }}
    onPress={(event) => { if (Platform.OS !== 'web') Vibration.vibrate(8); onPress?.(event); }}>
    {children}
  </AnimatedPressable>;
}

export function Screen({ children, style, scroll = false, contentStyle }: { children: ReactNode; style?: object; contentStyle?: object; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const width = viewportWidth || 390;
  const frameWidth = Math.min(width, 520);
  const contentWidth = Math.max(0, frameWidth - spacing[6] * 2);
  return <View style={[styles.screen, style]}><View style={[styles.screenFrame, { width: frameWidth }]}><View style={[styles.screenContent, { width: contentWidth, paddingTop: Math.max(insets.top, spacing[4]), paddingBottom: Math.max(insets.bottom, spacing[4]) }, contentStyle]}>{scroll ? <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scroll}>{children}</ScrollView> : children}</View></View></View>;
}
export function LargeTitle({ children, style }: { children: ReactNode; style?: object }) { return <Text accessibilityRole="header" style={[styles.largeTitle, style]}>{children}</Text>; }
export function Subtitle({ children, style }: { children: ReactNode; style?: object }) { return <Text style={[styles.subtitle, style]}>{children}</Text>; }
export function Card({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }

type ButtonProps = { label: string; onPress: () => void; children?: ReactNode; style?: object | object[]; disabled?: boolean; hint?: string };
function ButtonBase({ label, onPress, children, style, disabled, hint, variant }: ButtonProps & { variant: 'primary' | 'secondary' | 'text' | 'danger' }) {
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // eslint-disable-next-line react-hooks/immutability -- Reanimated owns this mutable animation value.
  useEffect(() => { scale.value = withTiming(!reduced && pressed ? 0.98 : 1, { duration: 120 }); }, [pressed, reduced, scale]);
  const feedback = () => { if (Platform.OS !== 'web') Vibration.vibrate(8); };
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} disabled={disabled}
    onPress={() => { feedback(); onPress(); }}
    onFocus={() => setFocused(true)}
    onBlur={() => setFocused(false)}
    onPressIn={() => setPressed(true)}
    onPressOut={() => setPressed(false)}
    style={[styles.buttonFrame, focused && Platform.OS === 'web' && styles.webFocus, disabled && styles.disabled]}>
    <Animated.View style={[styles.button, variant === 'primary' && styles.primary, variant === 'secondary' && styles.secondary, variant === 'text' && styles.textButton, variant === 'danger' && styles.danger, style, buttonStyle]}>{children ?? <Text style={[styles.buttonLabel, variant === 'secondary' && styles.darkLabel, variant === 'text' && styles.linkLabel]}>{label}</Text>}</Animated.View>
  </Pressable>;
}
export function PrimaryButton(props: ButtonProps) { return <ButtonBase {...props} variant="primary" />; }
export function SecondaryButton(props: ButtonProps) { return <ButtonBase {...props} variant="secondary" />; }
export function TextButton(props: ButtonProps) { return <ButtonBase {...props} variant="text" />; }
export function IconButton({ label, onPress, icon = '*', style }: ButtonProps & { icon?: string }) { return <SecondaryButton label={label} onPress={onPress} style={[styles.iconButton, ...(Array.isArray(style) ? style : style ? [style] : [])]}><Text accessibilityElementsHidden style={styles.icon}>{icon}</Text></SecondaryButton>; }
export function ListRow({ children, style }: { children: ReactNode; style?: object }) { return <View style={[styles.listRow, style]}>{children}</View>; }

export function EmergencyButton({ language = 'en', label }: { language?: SupportedLanguage; label?: string }) {
  const [busy, setBusy] = useState(false);
  const t = CHAT_UI_TEXT[language];
  const placeCall = async () => { try { setBusy(true); await Linking.openURL('tel:911'); } catch { Alert.alert(t.emergencyCallError); } finally { setBusy(false); } };
  const confirm = () => {
    if (Platform.OS === 'web') { if (globalThis.confirm(`${t.emergencyConfirmationTitle}\n${t.emergencyConfirmationMessage}`)) void placeCall(); }
    else Alert.alert(t.emergencyConfirmationTitle, t.emergencyConfirmationMessage, [{ text: t.emergencyCancelLabel, style: 'cancel' }, { text: t.emergencyConfirmLabel, onPress: () => void placeCall() }]);
  };
  return <AccessiblePressable accessibilityRole="button" accessibilityLabel={label ?? t.emergencyButtonLabel} accessibilityHint={t.emergencyConfirmationMessage} disabled={busy} onPress={confirm} style={[styles.buttonFrame, styles.fullWidth]}>
    <View style={styles.emergency}><Text accessibilityElementsHidden style={styles.phone}>☎</Text><Text style={styles.emergencyText}>{label ?? t.emergencyButtonLabel}</Text></View>
  </AccessiblePressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  screenFrame: { flex: 1, maxWidth: 520, alignSelf: 'center' },
  scrollArea: { flex: 1 },
  scroll: { flexGrow: 1 },
  screenContent: { flexGrow: 1, alignSelf: 'center', gap: spacing[4] },
  largeTitle: { width: '100%', color: colors.text, ...typeScale.largeTitle, fontFamily: 'Inter', textAlign: 'center', flexShrink: 1 },
  subtitle: { width: '100%', color: colors.secondaryText, ...typeScale.body, fontFamily: 'Inter' },
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderColor: colors.border, borderWidth: 1, padding: spacing[4], gap: spacing[3], ...softShadow },
  buttonFrame: { minHeight: 60, borderRadius: radius.pill, overflow: 'visible', justifyContent: 'center' },
  fullWidth: { width: '100%', boxSizing: 'border-box' },
  button: { flex: 1, minHeight: 60, borderRadius: radius.pill, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing[4], gap: spacing[2] },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.card }, textButton: { backgroundColor: colors.background }, danger: { backgroundColor: colors.danger },
  buttonLabel: { color: '#FFFFFF', ...typeScale.button, fontFamily: 'Inter', textAlign: 'center' }, darkLabel: { color: colors.primary }, linkLabel: { color: colors.accent, textDecorationLine: 'underline' },
  iconButton: { width: 60, height: 60, paddingHorizontal: 0 }, icon: { color: colors.primary, fontSize: 26 }, listRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  disabled: {}, emergency: { width: '100%', boxSizing: 'border-box', minHeight: 60, borderRadius: radius.pill, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 16 }, phone: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' }, emergencyText: { color: '#FFFFFF', fontFamily: 'Inter', ...typeScale.button, textAlign: 'center', flexShrink: 1 },
  webFocus: { borderWidth: 3, borderColor: colors.focus, outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.focus },
});
