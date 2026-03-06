"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthLocale } from "@/contexts/auth-locale";

const translations = {
  it: { copyright: "Tutti i diritti riservati." },
  en: { copyright: "All rights reserved." },
} as const;

export function AuthFooter() {
  const { locale, setLocale } = useAuthLocale();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[locale];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <footer className="mt-auto pt-8 flex items-center justify-between text-sm text-gray-500 overflow-visible">
      <span>© {new Date().getFullYear()} Orveeo. {t.copyright}</span>
      <div className="relative overflow-visible" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          {locale === "it" ? "IT" : "EN"}
          <svg
            className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute right-0 bottom-full mb-1 py-1 min-w-[8rem] rounded-md border border-gray-200 bg-white shadow-lg z-50">
            <button
              type="button"
              onClick={() => {
                setLocale("it");
                setDropdownOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                locale === "it" ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700"
              }`}
            >
              IT <span className="text-xs text-gray-500">Italiano</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocale("en");
                setDropdownOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                locale === "en" ? "bg-gray-50 font-medium text-gray-900" : "text-gray-700"
              }`}
            >
              EN <span className="text-xs text-gray-500">English</span>
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
