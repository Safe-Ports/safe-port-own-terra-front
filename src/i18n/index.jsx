import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { es } from "./es";
import { en } from "./en";

const LOCALE_KEY = "ot_locale";
const DICTS = { es, en };

const LocaleContext = createContext(null);

export function LocaleProvider({ children, defaultLocale }) {
  const [locale, setLocale] = useState(() => {
    if (defaultLocale === "en" || defaultLocale === "es") return defaultLocale;
    let stored = null;
    try {
      stored = typeof localStorage?.getItem === "function" ? localStorage.getItem(LOCALE_KEY) : null;
    } catch {
      // Storage can be unavailable in private browsing or isolated test environments.
    }
    if (stored === "en" || stored === "es") return stored;
    return navigator.language?.toLowerCase().startsWith("en") ? "en" : "es";
  });

  const localeTag = locale === "en" ? "en-US" : "es-MX";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const switchLocale = useCallback((lang) => {
    const nextLocale = lang === "en" ? "en" : "es";
    try {
      if (typeof localStorage?.setItem === "function") localStorage.setItem(LOCALE_KEY, nextLocale);
    } catch {
      // The in-memory language switch still works when persistence is unavailable.
    }
    setLocale(nextLocale);
  }, []);

  // Dot-notation path lookup: t("topbar.defaultTitle")
  // The path may contain slashes (e.g. "routes./lotes") — only dots are separators.
  const t = useCallback((path, fallback) => {
    const dict = DICTS[locale] || DICTS.es;
    const value = path.split(".").reduce((obj, key) => obj?.[key], dict);
    if (value != null && typeof value !== "object") return value;
    return fallback ?? path;
  }, [locale]);

  const format = useMemo(() => ({
    date: (value, options) => new Intl.DateTimeFormat(localeTag, options).format(new Date(value)),
    number: (value, options) => new Intl.NumberFormat(localeTag, options).format(Number(value)),
    currency: (value, currency = "MXN", options = {}) => new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency,
      ...options,
    }).format(Number(value)),
  }), [localeTag]);

  return (
    <LocaleContext.Provider value={{ locale, localeTag, switchLocale, t, format }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
