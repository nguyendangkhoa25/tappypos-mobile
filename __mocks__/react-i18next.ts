const t = (key: string, opts?: Record<string, unknown>) => {
  if (!opts) return key;
  return Object.entries(opts).reduce(
    (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
    key,
  );
};

export const useTranslation = () => ({
  t,
  i18n: { language: 'vi', changeLanguage: jest.fn() },
});

export const Trans = ({ children }: { children: React.ReactNode }) => children;

export const initReactI18next = { type: '3rdParty' as const, init: jest.fn() };
