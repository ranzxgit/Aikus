import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';
import { AikusAvatar } from '@/components/aikus-avatar';
import { AccessiblePressable as Pressable } from '@/components/ui';
import { useAppFlow } from '@/providers/app-flow-provider';
import { askAikus } from '@/services/ai';
import { getAvatarState } from '@/services/avatarState';
import { shouldSubmitOnEnter, getChatGreeting, getQuickReplies, isSendDisabled, shouldShowQuickReplies } from '@/services/chatPresentation';
import { hasEmergencyKeyword } from '@/services/emergencyKeywordCheck';
import { getEmergencyCalmMessage, getHealthNote, hasHealthKeyword } from '@/services/healthSafety';
import { getTimeGreeting } from '@/services/time';
import { getDirectTimeAnswer } from '@/services/timeQuestions';
import { getChatHistory, getProfileSettings, saveChatHistory, updateProfileSettings } from '@/services/profileStore';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ChatMessage } from '@/types/chat';
import type { TextSize } from '@/types/profile';

const uiText = {
  en: {
    home: 'Home', settings: 'Settings', thinking: 'Thinking...',
    language: 'Language', readAloud: 'Read aloud', stopReading: 'Stop reading', suggestions: 'Suggestions',
    latest: 'Latest',
    suggestionTitle: 'Suggestions', close: 'Close', selectLanguage: 'Choose a language',
    send: 'Send', input: 'Type a message', you: 'You', saveSettingsError: 'Could not save this setting.',
  },
  tl: {
    home: 'Tahanan', settings: 'Mga setting', thinking: 'Nag-iisip...',
    language: 'Wika', readAloud: 'Basahin nang malakas', stopReading: 'Itigil ang pagbasa', suggestions: 'Mga mungkahi',
    latest: 'Pinakabago',
    suggestionTitle: 'Mga mungkahi', close: 'Isara', selectLanguage: 'Pumili ng wika',
    send: 'Ipadala', input: 'Mag-type ng mensahe', you: 'Kayo', saveSettingsError: 'Hindi na-save ang setting na ito.',
  },
} as const;

function createWelcomeMessage(language: SupportedLanguage): ChatMessage {
  return {
    id: 'welcome-message',
    role: 'assistant',
    content: language === 'tl'
      ? `${getTimeGreeting(language)} Kumusta po kayo ngayon?`
      : `${getTimeGreeting(language)} I am Aikus. How can I help you today?`,
    createdAt: Date.now(),
  };
}

function speechLanguage(language: SupportedLanguage): string {
  return language === 'tl' ? 'fil-PH' : 'en-US';
}

async function hasVoice(language: SupportedLanguage): Promise<boolean> {
  try {
    const target = speechLanguage(language).toLowerCase();
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.some((voice) => voice.language.toLowerCase() === target);
  } catch {
    return false;
  }
}

function TypingDots({ label }: { label: string }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0.45);
  useEffect(() => {
    if (reducedMotion) {
      pulse.value = 0.8;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [pulse, reducedMotion]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <View accessibilityLabel={label} style={styles.dots}>
    {[0, 1, 2].map((dot) => <Animated.View key={dot} style={[styles.dot, dotStyle, { transform: [{ translateY: dot === 1 ? -1 : 0 }] }]} />)}
  </View>;
}

export default function ChatScreen() {
  const { activeProfile, language, changeLanguage } = useAppFlow();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(language)]);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasReceivedFirstToken, setHasReceivedFirstToken] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [timestampId, setTimestampId] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showLatest, setShowLatest] = useState(false);
  const [iconFontLoaded, setIconFontLoaded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const readAloudRef = useRef(false);
  const speechRequestRef = useRef(0);
  const emergencyVisible = messages.some((message) => message.role === 'user' && hasEmergencyKeyword(message.content));
  const uiStrings = CHAT_UI_TEXT[selectedLanguage];
  const localText = uiText[selectedLanguage];
  const avatarState = getAvatarState({ isSending, hasReceivedFirstToken, isSpeaking });
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const quickReplies = useMemo(() => getQuickReplies(selectedLanguage), [selectedLanguage]);

  useEffect(() => {
    void Ionicons.loadFont().then(() => setIconFontLoaded(true)).catch(() => setIconFontLoaded(false));
  }, []);

  useFocusEffect(useCallback(() => {
    if (!activeProfile) return undefined;
    let isActive = true;
    setProfileDataLoaded(false);
    Promise.all([getChatHistory(activeProfile.id), getProfileSettings(activeProfile)]).then(([history, settings]) => {
      if (!isActive) return;
      setSelectedLanguage(settings.language);
      readAloudRef.current = settings.readAloudEnabled;
      setReadAloudEnabled(settings.readAloudEnabled);
      setTextSize(settings.textSize);
      setMessages(history.length > 0 ? history : [createWelcomeMessage(settings.language)]);
      setIsAtBottom(true);
      setProfileDataLoaded(true);
    }).catch(() => {
      if (isActive) setProfileDataLoaded(true);
    });
    return () => { isActive = false; };
  }, [activeProfile]));

  useEffect(() => {
    if (activeProfile && profileDataLoaded) {
      void saveChatHistory(activeProfile.id, messages).catch(() => undefined);
    }
  }, [activeProfile, messages, profileDataLoaded]);

  useEffect(() => () => {
    speechRequestRef.current += 1;
    void Speech.stop().catch(() => undefined);
  }, []);

  const scrollToLatest = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setIsAtBottom(true);
    setShowLatest(false);
  }, []);

  const stopSpeech = useCallback(() => {
    speechRequestRef.current += 1;
    setIsSpeaking(false);
    setSpeakingMessageId(null);
    void Speech.stop().catch(() => undefined);
  }, []);

  const speakReply = useCallback(async (reply: string, languageToSpeak: SupportedLanguage, messageId: string, force = false) => {
    const requestId = ++speechRequestRef.current;
    try {
      if (!(await hasVoice(languageToSpeak))) {
        setVoiceUnavailable(true);
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        return;
      }
      if ((!force && !readAloudRef.current) || speechRequestRef.current !== requestId) return;
      setVoiceUnavailable(false);
      await Speech.stop().catch(() => undefined);
      Speech.speak(reply, {
        language: speechLanguage(languageToSpeak), rate: 0.9,
        onStart: () => { if (speechRequestRef.current === requestId) { setIsSpeaking(true); setSpeakingMessageId(messageId); } },
        onDone: () => { if (speechRequestRef.current === requestId) { setIsSpeaking(false); setSpeakingMessageId(null); } },
        onStopped: () => { if (speechRequestRef.current === requestId) { setIsSpeaking(false); setSpeakingMessageId(null); } },
        onError: () => { if (speechRequestRef.current === requestId) { setIsSpeaking(false); setSpeakingMessageId(null); setVoiceUnavailable(true); } },
      });
    } catch {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setVoiceUnavailable(true);
    }
  }, []);

  const submitMessage = useCallback(async (messageText = draft) => {
    const trimmed = messageText.trim();
    if (!trimmed || isSending || !profileDataLoaded || !activeProfile) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: trimmed, createdAt: Date.now() };
    const nextContext = [...messages, userMessage];
    const assistantId = `assistant-${Date.now()}`;
    const directTimeAnswer = getDirectTimeAnswer(trimmed, selectedLanguage);
    const emergencyCalmMessage = getEmergencyCalmMessage(trimmed, selectedLanguage);
    setMessages([...nextContext, {
      id: assistantId,
      role: 'assistant',
      content: emergencyCalmMessage ?? directTimeAnswer ?? '',
      createdAt: Date.now(),
    }]);
    setDraft('');
    setError('');
    setShowLatest(false);
    setIsAtBottom(true);
    requestAnimationFrame(scrollToLatest);
    if (emergencyCalmMessage) return;
    if (directTimeAnswer) {
      if (readAloudRef.current) void speakReply(directTimeAnswer, selectedLanguage, assistantId);
      return;
    }
    setHasReceivedFirstToken(false);
    setIsSending(true);
    try {
      const reply = await askAikus(nextContext, selectedLanguage, (cleanReply) => {
        setHasReceivedFirstToken(true);
        setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: cleanReply } : message));
      });
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: reply } : message));
      if (readAloudRef.current) void speakReply(reply, selectedLanguage, assistantId);
    } catch {
      setError(uiStrings.error);
      setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: uiStrings.error } : message));
    } finally {
      setIsSending(false);
    }
  }, [activeProfile, draft, isSending, messages, profileDataLoaded, scrollToLatest, selectedLanguage, speakReply, uiStrings.error]);

  const selectLanguage = (nextLanguage: SupportedLanguage) => {
    setSelectedLanguage(nextLanguage);
    setLanguageSheetOpen(false);
    void changeLanguage(nextLanguage).catch(() => undefined);
  };

  const setReadAloud = async (enabled: boolean) => {
    if (!activeProfile) return;
    setSettingsError('');
    readAloudRef.current = enabled;
    setReadAloudEnabled(enabled);
    try {
      await updateProfileSettings(activeProfile, { readAloudEnabled: enabled });
    } catch {
      readAloudRef.current = !enabled;
      setReadAloudEnabled(!enabled);
      setSettingsError(localText.saveSettingsError);
    }
  };

  const contentWidth = Math.min(width, 640);
  const sendDisabled = isSendDisabled(draft, isSending) || !profileDataLoaded;
  const inputTextSize = textSize === 'small' ? 20 : textSize === 'large' ? 26 : 20;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={[styles.flex, { width: contentWidth }]} behavior={Platform.OS === 'ios' || Platform.OS === 'web' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={localText.home} onPress={() => router.replace('/(app)/home')} style={styles.homeLink}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
            <Text style={styles.homeLinkText}>{localText.home}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.name}>Aikus</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={localText.settings} onPress={() => router.push('/(app)/settings')} style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.readAloudRow}>
          <View style={styles.readAloudLabel}>
            <Ionicons name="volume-high-outline" size={23} color={colors.text} />
            <Text style={styles.readAloudText}>{localText.readAloud}</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={localText.readAloud}
            value={readAloudEnabled}
            onValueChange={(enabled) => void setReadAloud(enabled)}
            disabled={!profileDataLoaded}
            trackColor={{ false: '#D9CFC4', true: '#F25A00' }}
            thumbColor="#FFFFFF"
          />
        </View>
        {settingsError ? <Text accessibilityRole="alert" style={styles.settingsError}>{settingsError}</Text> : null}
        <View style={styles.languageRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={localText.suggestions} onPress={() => setSuggestionsOpen(true)} style={styles.suggestionsButton}>
            <Ionicons name="sparkles-outline" size={18} color={colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${localText.language}: ${uiStrings.label}`} accessibilityHint={selectedLanguage === 'tl' ? 'Pindutin para pumili ng wika' : 'Choose a language'} onPress={() => setLanguageSheetOpen(true)} style={styles.languagePill}>
            <Text style={styles.languagePillText}>{uiStrings.label}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.secondaryText} />
          </Pressable>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.chatArea}>
          {shouldShowQuickReplies(messages) ? (
            <ScrollView contentContainerStyle={styles.emptyState} keyboardShouldPersistTaps="handled">
              <AikusAvatar state={avatarState} language={selectedLanguage} size={96} showName={false} />
              <Text accessibilityRole="header" style={styles.greeting}>{getChatGreeting(selectedLanguage)}</Text>
              <View style={styles.chipGrid}>
                {quickReplies.map((reply) => <Pressable key={reply} accessibilityRole="button" accessibilityLabel={reply} onPress={() => void submitMessage(reply)} style={styles.quickChip}>
                  <Text style={styles.quickChipText}>{reply}</Text>
                </Pressable>)}
              </View>
            </ScrollView>
          ) : (
            <>
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatList}
                contentContainerStyle={styles.chatListContent}
                onScroll={(event) => {
                  const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                  const atBottom = contentSize.height - layoutMeasurement.height - contentOffset.y < 56;
                  setIsAtBottom(atBottom);
                  if (atBottom) setShowLatest(false);
                }}
                scrollEventThrottle={100}
                onContentSizeChange={() => {
                  if (isAtBottom) scrollViewRef.current?.scrollToEnd({ animated: false });
                  else setShowLatest(true);
                }}
                keyboardShouldPersistTaps="handled"
              >
                {emergencyVisible ? <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.emergencyNotice}>
                  <Text style={styles.emergencyNoticeText}>{uiStrings.emergencyHelpMessage}</Text>
                </View> : null}
                {messages.map((message, index) => {
                  if (message.id === 'welcome-message') return null;
                  if (isSending && message.role === 'assistant' && !message.content) return null;
                  const previous = messages[index - 1];
                  const showHealthNote = message.role === 'assistant' && previous?.role === 'user' && hasHealthKeyword(previous.content);
                  const timeVisible = timestampId === message.id;
                  return <View key={message.id} style={[
                    styles.messageGroup,
                    message.role === 'user' ? styles.userGroup : styles.assistantGroup,
                    index > 0 && (previous?.role === message.role ? styles.sameSpeakerGap : styles.differentSpeakerGap),
                  ]}>
                    <View style={[styles.senderRow, message.role === 'user' && styles.userSenderRow]}>
                      {message.role === 'assistant' ? (
                        <View accessibilityElementsHidden style={styles.senderAvatar}>
                          <Text style={styles.senderInitial}>A</Text>
                        </View>
                      ) : null}
                      <Text style={styles.senderName}>{message.role === 'assistant' ? 'Aikus' : localText.you}</Text>
                      {message.role === 'assistant' ? <Pressable accessibilityRole="button" accessibilityLabel={speakingMessageId === message.id ? localText.stopReading : localText.readAloud} onPress={() => {
                        if (speakingMessageId === message.id) stopSpeech();
                        else void speakReply(message.content, selectedLanguage, message.id, true);
                      }} style={styles.speakerButton}>
                        <Ionicons name={speakingMessageId === message.id ? 'stop-circle-outline' : 'volume-high-outline'} size={20} color={colors.secondaryText} />
                      </Pressable> : null}
                    </View>
                    <Pressable accessibilityRole="text" accessibilityLabel={message.content} onPress={() => setTimestampId(timeVisible ? null : message.id)} style={[
                      styles.bubble,
                      message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    ]}>
                      <Text selectable style={[
                        styles.bubbleText,
                        { fontSize: inputTextSize },
                        message.role === 'user' && styles.userBubbleText,
                      ]}>{message.content}</Text>
                      {showHealthNote ? <Text style={styles.healthNote}>{getHealthNote(selectedLanguage)}</Text> : null}
                    </Pressable>
                    {timeVisible ? <Text style={[styles.timestamp, message.role === 'user' && styles.userTimestamp]}>{new Date(message.createdAt).toLocaleTimeString(selectedLanguage === 'tl' ? 'fil-PH' : 'en-US', { hour: 'numeric', minute: '2-digit' })}</Text> : null}
                  </View>;
                })}
                {isSending && !hasReceivedFirstToken ? <View style={[styles.messageGroup, styles.assistantGroup, styles.differentSpeakerGap]}>
                  <View style={styles.senderRow}>
                    <View accessibilityElementsHidden style={styles.senderAvatar}><Text style={styles.senderInitial}>A</Text></View>
                    <Text style={styles.senderName}>Aikus</Text>
                  </View>
                  <View style={[styles.bubble, styles.assistantBubble]}><TypingDots label={localText.thinking} /></View>
                </View> : null}
                {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
                {voiceUnavailable ? <Text style={styles.voiceMessage}>{uiStrings.voiceUnavailable}</Text> : null}
              </ScrollView>
              {showLatest ? <Pressable accessibilityRole="button" accessibilityLabel={localText.latest} onPress={scrollToLatest} style={styles.latestPill}>
                <Text style={styles.latestText}>{localText.latest}</Text><Ionicons name="arrow-down" size={18} color={colors.text} />
              </Pressable> : null}
            </>
          )}
        </View>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={localText.input}
              placeholderTextColor={colors.secondaryText}
              style={[styles.input, inputFocused && Platform.OS === 'web' && styles.inputFocused, { fontSize: inputTextSize }]}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              multiline
              maxLength={400}
              accessibilityLabel={localText.input}
              onKeyPress={(event) => {
                const keyEvent = event.nativeEvent as typeof event.nativeEvent & { shiftKey?: boolean };
                if (Platform.OS === 'web' && shouldSubmitOnEnter(keyEvent.key, Boolean(keyEvent.shiftKey))) {
                  event.preventDefault();
                  void submitMessage();
                }
              }}
              onSubmitEditing={() => { if (Platform.OS !== 'web') void submitMessage(); }}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={localText.send}
              style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
              onPress={() => void submitMessage()}
              disabled={sendDisabled}
            >
              {iconFontLoaded ? <Ionicons name="send" size={23} color="#2B2118" /> : <Text style={styles.sendFallback}>{localText.send}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={languageSheetOpen} transparent animationType="slide" onRequestClose={() => setLanguageSheetOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel={localText.close} onPress={() => setLanguageSheetOpen(false)} style={styles.backdropDismiss} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing[8]) }]}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{localText.selectLanguage}</Text>
            {(['en', 'tl'] as SupportedLanguage[]).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={CHAT_UI_TEXT[option].label} onPress={() => selectLanguage(option)} style={styles.sheetRow}>
              <Text style={styles.sheetRowText}>{CHAT_UI_TEXT[option].label}</Text>
              {selectedLanguage === option ? <Ionicons name="checkmark" size={22} color={colors.accent} /> : null}
            </Pressable>)}
          </View>
        </View>
      </Modal>
      <Modal visible={suggestionsOpen} transparent animationType="slide" onRequestClose={() => setSuggestionsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel={localText.close} onPress={() => setSuggestionsOpen(false)} style={styles.backdropDismiss} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing[8]) }]}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>{localText.suggestionTitle}</Text>
            {quickReplies.map((reply) => <Pressable key={reply} accessibilityRole="button" accessibilityLabel={reply} onPress={() => { setSuggestionsOpen(false); void submitMessage(reply); }} style={styles.sheetRow}>
              <Text style={styles.sheetRowText}>{reply}</Text>
            </Pressable>)}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  header: { height: 64, width: '100%', paddingHorizontal: spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeLink: { minWidth: 72, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill },
  homeLinkText: { color: colors.text, fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
  headerIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  name: { position: 'absolute', left: 88, right: 88, color: colors.text, fontSize: 24, lineHeight: 31, fontFamily: 'Inter', fontWeight: '800', textAlign: 'center' },
  readAloudRow: { minHeight: 62, width: '100%', paddingHorizontal: spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readAloudLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readAloudText: { color: colors.text, fontSize: 18, lineHeight: 26, fontFamily: 'Inter', fontWeight: '700' },
  settingsError: { color: colors.danger, fontSize: 16, paddingHorizontal: spacing[6] },
  languageRow: { width: '100%', minHeight: 56, paddingHorizontal: spacing[6], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestionsButton: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: radius.pill },
  languagePill: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: '#E9DFD0' },
  languagePillText: { color: colors.secondaryText, fontSize: 16, fontFamily: 'Inter', fontWeight: '600' },
  headerRule: { height: 1, width: '100%', backgroundColor: '#EFE7DE' },
  chatArea: { flex: 1, width: '100%', minHeight: 0, position: 'relative' },
  emptyState: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], gap: spacing[4] },
  greeting: { maxWidth: 460, color: colors.text, fontFamily: 'Inter', fontSize: 24, lineHeight: 34, fontWeight: '700', textAlign: 'center' },
  chipGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing[2] },
  quickChip: { minHeight: 52, minWidth: '46%', maxWidth: '100%', flexGrow: 1, paddingHorizontal: spacing[4], paddingVertical: spacing[2], justifyContent: 'center', alignItems: 'center', borderRadius: radius.card, borderWidth: 1, borderColor: '#E9DFD0', backgroundColor: colors.card },
  quickChipText: { color: colors.text, fontSize: 18, lineHeight: 24, fontFamily: 'Inter', fontWeight: '600', textAlign: 'center' },
  chatList: { flex: 1 },
  chatListContent: { flexGrow: 1, paddingHorizontal: spacing[6], paddingTop: spacing[3], paddingBottom: spacing[4] },
  messageGroup: { width: '100%', maxWidth: '100%' },
  userGroup: { alignItems: 'flex-end' },
  assistantGroup: { alignItems: 'flex-start' },
  sameSpeakerGap: { marginTop: spacing[2] },
  differentSpeakerGap: { marginTop: 22 },
  senderRow: { width: '84%', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  userSenderRow: { justifyContent: 'flex-end' },
  senderAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9DFD0' },
  senderInitial: { color: colors.text, fontSize: 18, lineHeight: 22, fontFamily: 'Inter', fontWeight: '800' },
  senderName: { color: colors.text, fontSize: 16, lineHeight: 22, fontFamily: 'Inter', fontWeight: '700' },
  bubble: { width: '84%', maxWidth: 440, paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22 },
  userBubble: { backgroundColor: '#F25A00', borderBottomRightRadius: 8 },
  assistantBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 8 },
  bubbleText: { color: colors.text, fontFamily: 'Inter', fontSize: 20, lineHeight: 30 },
  userBubbleText: { color: '#2B2118', fontWeight: '700' },
  healthNote: { color: colors.secondaryText, fontSize: 18, lineHeight: 25, marginTop: spacing[3] },
  speakerButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginLeft: 2, borderRadius: radius.pill },
  timestamp: { color: colors.secondaryText, fontSize: 16, lineHeight: 22, marginTop: 2 },
  userTimestamp: { alignSelf: 'flex-end' },
  dots: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: colors.secondaryText },
  emergencyNotice: { borderRadius: radius.card, padding: spacing[3], backgroundColor: '#FCE8E6', borderWidth: 1, borderColor: colors.danger, marginBottom: spacing[3] },
  emergencyNoticeText: { color: colors.danger, fontSize: 20, lineHeight: 28, fontFamily: 'Inter', fontWeight: '700', textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 18, lineHeight: 24, padding: spacing[3] },
  voiceMessage: { color: colors.secondaryText, fontSize: 16, paddingHorizontal: spacing[6], paddingBottom: spacing[2] },
  latestPill: { position: 'absolute', alignSelf: 'center', bottom: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, elevation: 2 },
  latestText: { color: colors.text, fontSize: 16, fontFamily: 'Inter', fontWeight: '600' },
  composer: { width: '100%', paddingHorizontal: spacing[6], paddingTop: spacing[2], gap: spacing[2] },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[2] },
  input: { flex: 1, minHeight: 56, maxHeight: 136, borderWidth: 1, borderColor: '#E9DFD0', borderRadius: 20, backgroundColor: 'transparent', paddingHorizontal: 16, paddingVertical: 12, color: colors.text, lineHeight: 28, fontFamily: 'Inter', textAlignVertical: 'center' },
  inputFocused: { borderWidth: 3, borderColor: colors.focus, outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.focus },
  sendButton: { width: 58, height: 58, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F25A00' },
  sendButtonDisabled: { opacity: 0.4 },
  sendFallback: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(22, 18, 15, 0.32)' },
  backdropDismiss: { ...StyleSheet.absoluteFill },
  sheet: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing[6], paddingTop: spacing[6], paddingBottom: spacing[8], borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background },
  sheetTitle: { color: colors.text, fontSize: 22, lineHeight: 30, fontFamily: 'Inter', fontWeight: '700', marginBottom: spacing[3] },
  sheetRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetRowText: { color: colors.text, fontSize: 20, lineHeight: 28, fontFamily: 'Inter' },
  webFocus: { borderWidth: 3, borderColor: colors.focus, outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.focus },
});
