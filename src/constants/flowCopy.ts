import type { SupportedLanguage } from '@/config';

export const FLOW_TEXT: Record<SupportedLanguage, {
  waking: string;
  languageTitle: string;
  languagePrompt: string;
  continue: string;
  chooseProfile: string;
  addProfile: string;
  guest: string;
  profileName: string;
  profileNameRequired: string;
  pin: string;
  skipPin: string;
  saveProfile: string;
  enterPin: string;
  incorrectPin: (remaining: number) => string;
  pinLocked: string;
  forgotPin: string;
  forgotPinMessage: string;
  noProfiles: string;
  settings: string;
  home: string;
  chat: string;
  hospitals: string;
  changeProfile: string;
  language: string;
  textSize: string;
  small: string;
  normal: string;
  large: string;
  animations: string;
  animationsOn: string;
  animationsOff: string;
  animationsSystem: string;
  readAloud: string;
  changePin: string;
  newPin: string;
  clearHistory: string;
  clearHistoryConfirm: string;
  deleteProfile: string;
  deleteProfileConfirm: (name: string) => string;
  cancel: string;
  confirm: string;
  logOut: string;
  ollamaUnavailable: string;
  ollamaRetry: string;
  saved: string;
  back: string;
  callNow: string;
  dismiss: string;
  manageProfilesPrompt: string;
}> = {
  en: {
    waking: 'Waking up Aikus...', languageTitle: 'Choose your language', languagePrompt: 'You can change this later in Settings.',
    continue: 'Continue', chooseProfile: 'Choose your profile', addProfile: 'Add profile', guest: 'Continue as Guest', profileName: 'Name',
    profileNameRequired: 'Please enter a name.', pin: 'Optional 4-digit PIN', skipPin: 'Skip PIN', saveProfile: 'Save profile',
    enterPin: 'Enter your PIN', incorrectPin: (remaining) => `That PIN did not match. ${remaining} tries left.`,
    pinLocked: 'Please wait 30 seconds, then try again.', forgotPin: 'Forgot PIN?',
    forgotPinMessage: 'A family member can remove this profile in Settings. Removing it also deletes this profile’s chat history.',
    noProfiles: 'Add a profile to continue.', settings: 'Settings', home: 'Home', chat: 'Talk to Aikus',
    hospitals: 'Nearest Hospital', changeProfile: 'Switch profile', language: 'Language', textSize: 'Text size',
    small: 'Small', normal: 'Normal', large: 'Large', animations: 'Animations',
    animationsOn: 'On', animationsOff: 'Off', animationsSystem: 'Follows system',
    readAloud: 'Read aloud', changePin: 'Change PIN',
    newPin: 'New 4-digit PIN (leave empty to remove)', clearHistory: 'Clear chat history',
    clearHistoryConfirm: 'Clear this profile’s chat history?', deleteProfile: 'Delete profile',
    deleteProfileConfirm: (name) => `Delete ${name} and its chat history? This cannot be undone.`,
    cancel: 'Cancel', confirm: 'Confirm', logOut: 'Log out',
    ollamaUnavailable: 'Aikus cannot reach the local helper right now. Chat replies may not work until it is running.',
    ollamaRetry: 'Retry connection', saved: 'Saved.', back: 'Back', callNow: 'Emergency Call 911', dismiss: 'Dismiss',
    manageProfilesPrompt: 'A family member can choose a profile below to manage or remove it.',
  },
  tl: {
    waking: 'Gumigising na si Aikus...', languageTitle: 'Piliin ang wika', languagePrompt: 'Maaari ninyo itong palitan sa Settings.',
    continue: 'Magpatuloy', chooseProfile: 'Piliin ang profile ninyo', addProfile: 'Magdagdag ng profile', guest: 'Magpatuloy bilang Bisita', profileName: 'Pangalan',
    profileNameRequired: 'Ilagay po ang pangalan.', pin: 'Opsyonal na 4 na digit na PIN', skipPin: 'Laktawan ang PIN', saveProfile: 'I-save ang profile',
    enterPin: 'Ilagay ang PIN', incorrectPin: (remaining) => `Hindi tugma ang PIN. May ${remaining} pagsubok pa.`,
    pinLocked: 'Maghintay ng 30 segundo bago subukan muli.', forgotPin: 'Nakalimutan ang PIN?',
    forgotPinMessage: 'Maaaring alisin ng kapamilya ang profile na ito sa Settings. Mabubura rin ang chat history nito.',
    noProfiles: 'Magdagdag ng profile para magpatuloy.', settings: 'Settings', home: 'Home', chat: 'Kausapin si Aikus',
    hospitals: 'Pinakamalapit na ospital', changeProfile: 'Palitan ang profile', language: 'Wika', textSize: 'Laki ng teksto',
    small: 'Maliit', normal: 'Karaniwan', large: 'Malaki', animations: 'Mga animation',
    animationsOn: 'Naka-on', animationsOff: 'Naka-off', animationsSystem: 'Sundin ang setting ng device',
    readAloud: 'Basahin nang malakas', changePin: 'Palitan ang PIN',
    newPin: 'Bagong 4 na digit na PIN (iwanang walang laman para alisin)', clearHistory: 'Burahin ang chat history',
    clearHistoryConfirm: 'Burahin ang chat history ng profile na ito?', deleteProfile: 'Burahin ang profile',
    deleteProfileConfirm: (name) => `Burahin si ${name} at ang chat history nito? Hindi na ito maibabalik.`,
    cancel: 'Huwag muna', confirm: 'Kumpirmahin', logOut: 'Mag-log out',
    ollamaUnavailable: 'Hindi maabot ni Aikus ang local helper ngayon. Maaaring hindi gumana ang chat hanggang sa tumakbo ito.',
    ollamaRetry: 'Subukan muli ang koneksyon', saved: 'Nai-save.', back: 'Bumalik', callNow: 'Tumawag sa 911', dismiss: 'Isara',
    manageProfilesPrompt: 'Maaaring pumili ng profile sa ibaba ang kapamilya para pamahalaan o alisin ito.',
  },
};
