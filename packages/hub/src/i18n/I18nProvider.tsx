import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LOCALES_BY_LANGUAGE,
  translations,
  type Language,
} from "@/i18n/translations";

type TranslateValues = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, values?: TranslateValues) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  formatMonthYear: (value: Date | string | number) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const getNestedValue = (source: unknown, key: string): string | undefined => {
  if (!key) return undefined;

  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, source) as string | undefined;
};

const interpolate = (template: string, values?: TranslateValues) => {
  if (!values) return template;

  return template.replace(/{{\s*(\w+)\s*}}/g, (_, token: string) => String(values[token] ?? ""));
};

const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "pt" || stored === "en") return stored;

  const browserLanguage = window.navigator.language.toLowerCase();
  return browserLanguage.startsWith("pt") ? "pt" : DEFAULT_LANGUAGE;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<I18nContextValue>(() => {
    const locale = LOCALES_BY_LANGUAGE[language];

    return {
      language,
      locale,
      setLanguage: setLanguageState,
      t: (key, values) => {
        const message = getNestedValue(translations[language], key) ?? getNestedValue(translations[DEFAULT_LANGUAGE], key) ?? key;
        return interpolate(message, values);
      },
      formatDate: (value, options) => new Intl.DateTimeFormat(locale, options).format(new Date(value)),
      formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
      formatCurrency: (value, currency = "EUR", options) => new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        ...options,
      }).format(value),
      formatMonthYear: (value) => new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(new Date(value)),
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}