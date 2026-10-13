import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHAT_UI_TEXT, type SupportedLanguage } from '@/config';
import { EmergencyCallButton } from '@/components/emergency-call-button';
import { askAikus } from '@/services/ai';
import { hasEmergencyKeyword } from '@/services/emergencyKeywordCheck';
import type { ChatMessage } from '@/types/chat';

const LANGUAGE_STORAGE_KEY = 'aikus-language';
const initialMessages: ChatMessage[] = [
  {
    id: 'welcome-message',
    role: 'assistant',
    content: 'Hello. I am Aikus. How can I help you today?',
    createdAt: Date.now(),
  },
];

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
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [readAloudEnabled, setReadAloudEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceUnavailable, setVoiceUnavailable] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const readAloudRef = useRef(false);
  const speechRequestRef = useRef(0);

  const uiStrings = useMemo(() => CHAT_UI_TEXT[selectedLanguage], [selectedLanguage]);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        if (!isActive) {
          return;
        }

        if (value === 'en' || value === 'tl') {
          setSelectedLanguage(value);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage).catch(() => undefined);
  }, [selectedLanguage]);

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
    if (!trimmed || isSending) {
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

    setMessages([
      ...nextContext,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      },
    ]);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const reply = await askAikus(nextContext, selectedLanguage, (cleanReply) => {
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.brandName}>AIKUS</Text>
          <Text style={styles.caption}>Local companion</Text>
        </View>

        <View style={styles.languageToggle}>
          {(['en', 'tl'] as SupportedLanguage[]).map((language) => (
            <Pressable
              key={language}
              accessibilityRole="button"
              accessibilityLabel={CHAT_UI_TEXT[language].label}
              onPress={() => setSelectedLanguage(language)}
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
              trackColor={{ false: '#A9A29D', true: '#246B45' }}
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
              <EmergencyCallButton
                language={selectedLanguage}
                label={uiStrings.emergencyCallLabel}
              />
            </View>
          ) : null}
          {messages.map((message) => {
            if (isSending && message.role === 'assistant' && !message.content) {
              return null;
            }

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
                      message.role === 'user' && styles.userBubbleText,
                    ]}
                  >
                    {message.content || '...'}
                  </Text>
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
            placeholderTextColor="#615148"
            style={styles.input}
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
            disabled={!draft.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>{uiStrings.sendLabel}</Text>
          </Pressable>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F4',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E1D6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    color: '#32251F',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 2,
  },
  caption: {
    color: '#A46841',
    fontSize: 18,
    fontWeight: '600',
  },
  languageToggle: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  languageButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D9CD',
    backgroundColor: '#FFFDFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#8A3417',
    borderColor: '#8A3417',
  },
  languageButtonText: {
    color: '#32251F',
    fontSize: 18,
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: '#FFFFFF',
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8D9CD',
    borderRadius: 14,
    backgroundColor: '#FFFDFB',
    paddingHorizontal: 14,
  },
  controlLabel: {
    color: '#32251F',
    fontSize: 18,
    fontWeight: '700',
  },
  stopButton: {
    minHeight: 56,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#70421F',
    backgroundColor: '#FFFDFB',
    paddingHorizontal: 14,
  },
  stopButtonDisabled: {
    backgroundColor: '#F0E8E2',
  },
  stopButtonText: {
    color: '#32251F',
    fontSize: 18,
    fontWeight: '700',
  },
  voiceMessage: {
    color: '#70421F',
    fontSize: 18,
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
    borderColor: '#B42318',
  },
  emergencyNoticeText: {
    color: '#7A1710',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
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
    backgroundColor: '#8A3417',
  },
  assistantBubble: {
    backgroundColor: '#F8E9DE',
  },
  bubbleText: {
    color: '#2D241F',
    fontSize: 20,
    lineHeight: 30,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#9D2F2F',
    fontSize: 18,
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
    borderTopColor: '#F1E1D6',
    backgroundColor: '#FFF9F4',
  },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E8D9CD',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    color: '#2D241F',
    fontSize: 20,
    lineHeight: 28,
  },
  sendButton: {
    minHeight: 56,
    minWidth: 90,
    borderRadius: 16,
    backgroundColor: '#8A3417',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    backgroundColor: '#70421F',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
});
