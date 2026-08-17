'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en } from './i18n/en';
import { gu } from './i18n/gu';

export type Lang = 'en' | 'gu';
export type DictKey = keyof typeof en;

const DICTS: Record<Lang, Record<DictKey, string>> = { en, gu };
const STORAGE_KEY = 'vrundavan-admin-lang';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'gu') setLangState(stored);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const t = (key: DictKey) => DICTS[lang][key] ?? DICTS.en[key] ?? key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
