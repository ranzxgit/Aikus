import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { SupportedLanguage } from '@/config';

const LANGUAGE_STORAGE_KEY = 'aikus-language';

export function useLanguageSetting() {
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((value) => {
        if (active && (value === 'en' || value === 'tl')) setLanguage(value);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language).catch(() => undefined);
  }, [language, loaded]);

  const changeLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    setLanguage(nextLanguage);
  }, []);

  return { language, changeLanguage };
}
