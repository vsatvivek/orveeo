"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Locale = "it" | "en";

const STORAGE_KEY = "orveeo-locale";

const AuthLocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
} | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "it";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "it";
}

export function AuthLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("it");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setLocaleState(getStoredLocale());
      setHydrated(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const value = hydrated ? { locale, setLocale } : { locale: "it" as Locale, setLocale };

  return (
    <AuthLocaleContext.Provider value={value}>
      {children}
    </AuthLocaleContext.Provider>
  );
}

export function useAuthLocale() {
  const ctx = useContext(AuthLocaleContext);
  if (!ctx) throw new Error("useAuthLocale must be used within AuthLocaleProvider");
  return ctx;
}
