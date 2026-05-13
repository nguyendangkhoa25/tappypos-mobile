import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export const LANGUAGE_STORAGE_KEY = 'user_language';

// Module-level guard so AsyncStorage is only read once on first mount
let booted = false;

export type AppLanguage = 'vi' | 'en';

export function useLanguage() {
  const [language, setLanguage] = useState<AppLanguage>(
    i18n.language === 'en' ? 'en' : 'vi'
  );

  useEffect(() => {
    // Sync React state whenever i18n language changes (e.g. triggered by another component)
    const onChanged = (lng: string) => setLanguage(lng === 'en' ? 'en' : 'vi');
    i18n.on('languageChanged', onChanged);

    // Read persisted preference once on first mount across the whole app
    if (!booted) {
      booted = true;
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
        if (saved === 'vi' || saved === 'en') {
          i18n.changeLanguage(saved);
        }
      });
    }

    return () => i18n.off('languageChanged', onChanged);
  }, []);

  const changeLanguage = async (lang: AppLanguage) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  };

  return { language, changeLanguage };
}
