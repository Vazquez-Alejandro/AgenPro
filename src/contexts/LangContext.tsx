"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getTranslations, type Locale, type Translations } from "@/i18n";

const LangContext = createContext<{
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}>({
  locale: "es",
  t: getTranslations("es"),
  setLocale: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("lang") as Locale | null;
    if (stored) setLocale(stored);
  }, []);

  const handleSetLocale = (l: Locale) => {
    setLocale(l);
    localStorage.setItem("lang", l);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LangContext.Provider
      value={{ locale, t: getTranslations(locale), setLocale: handleSetLocale }}
    >
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
