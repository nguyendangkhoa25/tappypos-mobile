import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import vi from './locales/vi.json';
import en from './locales/en.json';

const langCode = Localization.getLocales()[0]?.languageCode;

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: langCode === 'en' ? 'en' : 'vi',
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18n;
