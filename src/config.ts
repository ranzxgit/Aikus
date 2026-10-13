export const APP_NAME = 'Aikus';

export const OLLAMA_BASE_URL = 'http://localhost:11434';
export const MODEL_NAME = 'gemma3:4b';

export const AI_ENGINE = 'ollama-web';

export type SupportedLanguage = 'en' | 'tl';

export const OLLAMA_OPTIONS = {
  temperature: 0.4,
  top_p: 0.9,
  num_predict: 120,
} as const;

export const CHAT_UI_TEXT: Record<
  SupportedLanguage,
  {
    label: string;
    placeholder: string;
    sendLabel: string;
    typing: string;
    error: string;
    lastReply: string;
    emergencyButtonLabel: string;
    emergencyCallLabel: string;
    emergencyHelpMessage: string;
    emergencyConfirmationTitle: string;
    emergencyConfirmationMessage: string;
    emergencyCancelLabel: string;
    emergencyConfirmLabel: string;
    emergencyCallError: string;
    readAloudLabel: string;
    stopSpeechLabel: string;
    voiceUnavailable: string;
  }
> = {
  en: {
    label: 'English',
    placeholder: 'Type a message',
    sendLabel: 'Send',
    typing: 'Aikus is thinking...',
    error: "I can't reach my brain right now. Please check that the helper program is running.",
    lastReply: 'Last reply:',
    emergencyButtonLabel: 'Emergency Call 911',
    emergencyCallLabel: 'Call 911',
    emergencyHelpMessage: 'Do you need help? Call 911.',
    emergencyConfirmationTitle: 'Call 911?',
    emergencyConfirmationMessage: 'Do you want to call emergency services now?',
    emergencyCancelLabel: 'Cancel',
    emergencyConfirmLabel: 'Call now',
    emergencyCallError: 'Could not open the phone app.',
    readAloudLabel: 'Read aloud',
    stopSpeechLabel: 'Stop',
    voiceUnavailable: 'A voice for this language is not available.',
  },
  tl: {
    label: 'Tagalog',
    placeholder: 'Mag-type ng mensahe',
    sendLabel: 'Ipadala',
    typing: 'Nag-iisip si Aikus...',
    error: 'Hindi ko maabot ang aking isip sa ngayon. Pakisuri na tumatakbo ang helper program.',
    lastReply: 'Huling sagot:',
    emergencyButtonLabel: 'Emergency Call 911',
    emergencyCallLabel: 'Tumawag sa 911',
    emergencyHelpMessage: 'Kailangan po ba ninyo ng tulong? Tumawag sa 911.',
    emergencyConfirmationTitle: 'Tatawag po ba sa 911?',
    emergencyConfirmationMessage: 'Gusto po ba ninyong tumawag sa serbisyong pang-emergency ngayon?',
    emergencyCancelLabel: 'Huwag muna',
    emergencyConfirmLabel: 'Tumawag na',
    emergencyCallError: 'Hindi mabuksan ang app para tumawag.',
    readAloudLabel: 'Basahin nang malakas',
    stopSpeechLabel: 'Itigil',
    voiceUnavailable: 'Walang boses para sa wikang ito.',
  },
};

export function getChatUiText(language: SupportedLanguage = 'en') {
  return CHAT_UI_TEXT[language];
}
