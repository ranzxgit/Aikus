import { colors } from '@/theme/tokens';
import { AccessiblePressable as Pressable, EmergencyButton, Screen } from '@/components/ui';
import * as Speech from 'expo-speech';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';
import { AikusAvatar } from '@/components/aikus-avatar';
import { FLOW_TEXT } from '@/constants/flowCopy';
import { useAppFlow } from '@/providers/app-flow-provider';
import { askAikus } from '@/services/ai';
import { getAvatarState } from '@/services/avatarState';
import { hasEmergencyKeyword } from '@/services/emergencyKeywordCheck';
import { getEmergencyCalmMessage, getHealthNote, hasHealthKeyword } from '@/services/healthSafety';
import { getTimeGreeting } from '@/services/time';
import { getDirectTimeAnswer } from '@/services/timeQuestions';
import { getChatHistory, getProfileSettings, saveChatHistory, updateProfileSettings } from '@/services/profileStore';
import type { ChatMessage } from '@/types/chat';
import type { TextSize } from '@/types/profile';

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

function getSpeechLanguage(language: SupportedLanguage): string {
  return language === 'tl' ? 'fil-PH' : 'en-US';
}

async function hasVoiceForLanguage(language: SupportedLanguage): Promise<boolean> {
  try {
    const targetLanguage = getSpeechLanguage(language).toLocaleLowerCase();
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.some((voice) => voice.language.toLocaleLowerCase() === targetLanguage);
  } catch {
    return false;
  }
}

export default function LoginScreen() {
  const { activeProfile, language, changeLanguage } = useAppFlow();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(language);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage('en')]);
  const [profileDataLoaded, setProfileDataLoaded] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasReceivedFirstToken, setHasReceivedFirstToken] = useState(false);
  const [error, setError] = useState('');
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const readAloudRef = useRef(false);
  const speechRequestRef = useRef(0);

  const uiStrings = useMemo(() => CHAT_UI_TEXT[selectedLanguage], [selectedLanguage]);
  const flowText = FLOW_TEXT[selectedLanguage];
  const avatarState = getAvatarState({ isSending, hasReceivedFirstToken, isSpeaking });

  useFocusEffect(useCallback(() => {
    if (!activeProfile) return undefined;
    let isActive = true;
    setProfileDataLoaded(false);
    Promise.all([getChatHistory(activeProfile.id), getProfileSettings(activeProfile)]).then(([history, settings]) => {
      if (!isActive) return;
      setSelectedLanguage(settings.language);
      setReadAloudEnabled(settings.readAloudEnabled);
      readAloudRef.current = settings.readAloudEnabled;
      setTextSize(settings.textSize);
      setMessages(history.length > 0 ? history : [createWelcomeMessage(settings.language)]);
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

  const stopSpeech = () => {
    speechRequestRef.current += 1;
    setIsSpeaking(false);
    void Speech.stop().catch(() => undefined);
  };

  const changeReadAloud = async (enabled: boolean) => {
    readAloudRef.current = enabled;
    setReadAloudEnabled(enabled);
    if (activeProfile) {
      void updateProfileSettings(activeProfile, { readAloudEnabled: enabled }).catch(() => undefined);
    }
    setVoiceUnavailable(false);

    if (!enabled) {
      speechRequestRef.current += 1;
      setIsSpeaking(false);
      void Speech.stop().catch(() => undefined);
      return;
    }

    if (!(await hasVoiceForLanguage(selectedLanguage))) {
      setVoiceUnavailable(true);
    }
  };

  const speakReply = async (reply: string, language: SupportedLanguage) => {
    const requestId = ++speechRequestRef.current;
    try {
      const voiceAvailable = await hasVoiceForLanguage(language);
      if (!voiceAvailable) {
        setVoiceUnavailable(true);
        setIsSpeaking(false);
        return;
      }
      if (!readAloudRef.current || speechRequestRef.current !== requestId) {
        return;
      }

      setVoiceUnavailable(false);
      await Speech.stop().catch(() => undefined);
      Speech.speak(reply, {
        language: getSpeechLanguage(language),
        rate: 0.9,
        onStart: () => {
          if (speechRequestRef.current === requestId) setIsSpeaking(true);
        },
        onDone: () => {
          if (speechRequestRef.current === requestId) setIsSpeaking(false);
        },
        onStopped: () => {
          if (speechRequestRef.current === requestId) setIsSpeaking(false);
        },
        onError: () => {
          if (speechRequestRef.current === requestId) {
            setIsSpeaking(false);
            setVoiceUnavailable(true);
          }
        },
      });
    } catch {
      setIsSpeaking(false);
      setVoiceUnavailable(true);
    }
  };

  const submitMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || !profileDataLoaded || !activeProfile) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    const nextContext = [...messages, userMessage];
    const assistantId = `assistant-${Date.now()}`;
    const directTimeAnswer = getDirectTimeAnswer(trimmed, selectedLanguage);
    const emergencyCalmMessage = getEmergencyCalmMessage(trimmed, selectedLanguage);

    setMessages([
      ...nextContext,
      {
        id: assistantId,
        role: 'assistant',
        content: emergencyCalmMessage ?? directTimeAnswer ?? '',
        createdAt: Date.now(),
      },
    ]);
    setDraft('');
    setError('');
    if (emergencyCalmMessage) {
      return;
    }
    if (directTimeAnswer) {
      if (readAloudRef.current) {
        void speakReply(directTimeAnswer, selectedLanguage);
      }
      return;
    }
    setHasReceivedFirstToken(false);
    setIsSending(true);

    try {
      const reply = await askAikus(nextContext, selectedLanguage, (cleanReply) => {
        setHasReceivedFirstToken(true);
        setMessages((current) => {
          return current.map((message) =>
            message.id === assistantId ? { ...message, content: cleanReply } : message,
          );
        });
      });

      setMessages((current) => {
        return current.map((message) =>
          message.id === assistantId ? { ...message, content: reply } : message,
        );
      });
      if (readAloudRef.current) {
        void speakReply(reply, selectedLanguage);
      }
    } catch {
      setError(uiStrings.error);
      setMessages((current) => {
        return current.map((message) =>
          message.id === assistantId ? { ...message, content: uiStrings.error } : message,
        );
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Screen style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.brandName}>AIKUS</Text>
          <Text style={styles.caption}>{selectedLanguage === 'tl' ? 'Kaibigang lokal' : 'Local companion'}</Text>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={flowText.home} onPress={() => router.replace('/(app)/home')} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>{flowText.home}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={flowText.settings} onPress={() => router.push('/(app)/settings')} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>{flowText.settings}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.avatarScale}><AikusAvatar state={avatarState} language={selectedLanguage} /></View>

        <View style={styles.languageToggle}>
          {(['en', 'tl'] as SupportedLanguage[]).map((language) => (
            <Pressable
              key={language}
              accessibilityRole="button"
              accessibilityLabel={CHAT_UI_TEXT[language].label}
              onPress={() => {
                void changeLanguage(language).catch(() => undefined);
                setSelectedLanguage(language);
                setMessages((current) =>
                  current.length === 1 && current[0]?.id === 'welcome-message'
                    ? [createWelcomeMessage(language)]
                    : current,
                );
              }}
              style={[
                styles.languageButton,
                selectedLanguage === language && styles.languageButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  selectedLanguage === language && styles.languageButtonTextActive,
                ]}
              >
                {CHAT_UI_TEXT[language].label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.speechControls}>
          <View style={styles.readAloudControl}>
            <Text style={styles.controlLabel}>{uiStrings.readAloudLabel}</Text>
            <Switch
              accessibilityRole="switch"
              accessibilityLabel={uiStrings.readAloudLabel}
              hitSlop={10}
              value={readAloudEnabled}
              onValueChange={(enabled) => void changeReadAloud(enabled)}
              trackColor={{ false: '#A9A29D', true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiStrings.stopSpeechLabel}
            onPress={stopSpeech}
            disabled={!isSpeaking}
            style={[styles.stopButton, !isSpeaking && styles.stopButtonDisabled]}
          >
            <Text style={styles.stopButtonText}>{uiStrings.stopSpeechLabel}</Text>
          </Pressable>
        </View>
        {voiceUnavailable ? <Text style={styles.voiceMessage}>{uiStrings.voiceUnavailable}</Text> : null}

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatListContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.some((message) => message.role === 'user' && hasEmergencyKeyword(message.content)) ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={styles.emergencyNotice}
            >
              <Text style={styles.emergencyNoticeText}>{uiStrings.emergencyHelpMessage}</Text>
              <EmergencyButton
                language={selectedLanguage}
                label={uiStrings.emergencyCallLabel}
              />
            </View>
          ) : null}
          {messages.map((message, index) => {
            if (isSending && message.role === 'assistant' && !message.content) {
              return null;
            }

            const previousMessage = messages[index - 1];
            const showHealthNote = message.role === 'assistant'
              && previousMessage?.role === 'user'
              && hasHealthKeyword(previousMessage.content);

            return (
              <View
                key={message.id}
                style={[
                  styles.bubbleWrap,
                  message.role === 'user' ? styles.userRow : styles.assistantRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { fontSize: textSize === 'small' ? 18 : textSize === 'large' ? 24 : 20, fontFamily: 'Inter' },
                      message.role === 'user' && styles.userBubbleText,
                    ]}
                  >
                    {message.content || '...'}
                  </Text>
                  {showHealthNote ? (
                    <Text style={styles.healthNote}>{getHealthNote(selectedLanguage)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {isSending && (
            <View style={[styles.bubbleWrap, styles.assistantRow]}>
              <View style={[styles.bubble, styles.assistantBubble]}>
                <Text style={styles.bubbleText}>{uiStrings.typing}</Text>
              </View>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.inputWrap}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={uiStrings.placeholder}
            placeholderTextColor="#5C5148"
            style={[styles.input, { fontSize: textSize === 'small' ? 18 : textSize === 'large' ? 24 : 20 }]}
            multiline
            maxLength={400}
            accessibilityLabel={uiStrings.placeholder}
            onSubmitEditing={submitMessage}
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={uiStrings.sendLabel}
            style={[styles.sendButton, (!draft.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={submitMessage}
            disabled={!draft.trim() || isSending || !profileDataLoaded}
          >
            <Text accessibilityElementsHidden style={styles.sendButtonText}>?</Text>
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
  },
  avatarScale: { transform: [{ scale: 1.125 }] },
  brandName: {
    color: colors.text,
    fontSize: 20,
    fontFamily: 'Inter',
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  caption: {
    color: colors.secondaryText,
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  headerButton: { minHeight: 60, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#F0E3DA' },
  headerButtonText: { color: colors.text, fontSize: 18,
    fontFamily: 'Inter', lineHeight: 24, fontWeight: '700' },
  languageToggle: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  languageButton: {
    flex: 1,
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageButtonText: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: colors.card,
  },
  speechControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  readAloudControl: {
    flex: 1,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  controlLabel: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  stopButton: {
    minHeight: 60,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.secondaryText,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  stopButtonDisabled: {
    backgroundColor: '#F0E8E2',
  },
  stopButtonText: {
    color: colors.text,
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  voiceMessage: {
    color: colors.secondaryText,
    fontSize: 18,
    fontFamily: 'Inter',
    lineHeight: 24,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  emergencyNotice: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#FCE8E6',
    borderWidth: 2,
    borderColor: colors.danger,
  },
  emergencyNoticeText: {
    color: colors.danger,
    fontSize: 24,
    fontFamily: 'Inter',
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  healthNote: {
    color: colors.secondaryText,
    fontSize: 18,
    fontFamily: 'Inter',
    lineHeight: 23,
    marginTop: 10,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  bubbleWrap: {
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.card,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 20,
    fontFamily: 'Inter',
    lineHeight: 30,
  },
  userBubbleText: {
    color: colors.card,
  },
  errorText: {
    color: colors.danger,
    fontSize: 18,
    fontFamily: 'Inter',
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 60,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 20,
    fontFamily: 'Inter',
    lineHeight: 28,
  },
  sendButton: {
    minHeight: 60,
    minWidth: 60,
    width: 60,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    backgroundColor: colors.secondaryText,
  },
  sendButtonText: {
    color: colors.card,
    fontSize: 30,
    fontFamily: 'Inter',
    lineHeight: 36,
    fontWeight: '700',
  },
});
