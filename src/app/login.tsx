import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ORANGE = '#D9642B';

function MiniRobot() {
  return (
    <View style={styles.miniRobot} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.miniAntenna} />
      <View style={styles.miniFace}>
        <View style={styles.miniEyes}><View style={styles.miniEye} /><View style={styles.miniEye} /></View>
        <View style={styles.miniSmile} />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandRow}>
            <MiniRobot />
            <Text style={styles.brandName}>AIKUS</Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.heading} accessibilityRole="header">Welcome back</Text>
            <Text style={styles.subheading}>Your caring companion is right here.</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9B8D84"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              accessibilityLabel="Email address"
              returnKeyType="next"
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.label}>Password</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'} onPress={() => setPasswordVisible(!passwordVisible)} hitSlop={8}>
                <Text style={styles.showPassword}>{passwordVisible ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9B8D84"
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              accessibilityLabel="Password"
              returnKeyType="done"
            />

            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>Log in</Text>
            </Pressable>

            <Pressable accessibilityRole="button" style={styles.forgotButton}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          <View style={styles.supportCard}>
            <Text style={styles.supportTitle}>Need a hand?</Text>
            <Text style={styles.supportText}>We’re here to help you get started.</Text>
            <Pressable accessibilityRole="button" style={styles.helpButton}>
              <Text style={styles.helpButtonText}>Contact support</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>A little care, whenever you need it.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#FFF9F4' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 26, paddingTop: 14, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  miniRobot: { width: 42, height: 42, borderRadius: 15, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  miniAntenna: { position: 'absolute', top: -5, width: 3, height: 9, borderRadius: 2, backgroundColor: '#B64C20' },
  miniFace: { width: 31, height: 25, borderRadius: 9, backgroundColor: '#FFF9F4', alignItems: 'center', justifyContent: 'center' },
  miniEyes: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  miniEye: { width: 4, height: 5, borderRadius: 3, backgroundColor: '#653C31' },
  miniSmile: { width: 8, height: 4, borderBottomWidth: 1.5, borderRadius: 4, borderColor: ORANGE },
  brandName: { color: '#32251F', fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  intro: { marginTop: 45 },
  heading: { color: '#32251F', fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  subheading: { marginTop: 8, color: '#76665C', fontSize: 17, lineHeight: 25 },
  form: { marginTop: 34 },
  label: { color: '#43352D', fontSize: 16, lineHeight: 22, fontWeight: '600', marginBottom: 9 },
  input: { height: 58, borderWidth: 1, borderColor: '#E6D9CF', borderRadius: 15, paddingHorizontal: 16, color: '#32251F', backgroundColor: '#FFFFFF', fontSize: 17, marginBottom: 23 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  showPassword: { color: ORANGE, fontSize: 15, fontWeight: '700', paddingBottom: 9 },
  primaryButton: { height: 60, borderRadius: 16, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 7, shadowColor: '#A94717', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  pressed: { opacity: 0.84 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  forgotButton: { minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  forgotText: { color: ORANGE, fontSize: 16, fontWeight: '700' },
  supportCard: { backgroundColor: '#FCEBDD', borderRadius: 18, padding: 19, marginTop: 15 },
  supportTitle: { color: '#533A2A', fontSize: 17, fontWeight: '700' },
  supportText: { color: '#70594A', fontSize: 15, lineHeight: 22, marginTop: 5 },
  helpButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 5 },
  helpButtonText: { color: '#A64D25', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  footer: { color: '#8A796F', textAlign: 'center', fontSize: 14, marginTop: 25 },
} satisfies Record<string, TextStyle | ViewStyle>;

