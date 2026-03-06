"use client";

import { useAuth } from "@/providers/firebase-auth-provider";
import { useAuthLocale } from "@/contexts/auth-locale";

const translations = {
  it: "Esci",
  en: "Sign out",
} as const;

export function SignoutButton() {
  const { signOut } = useAuth();
  const { locale } = useAuthLocale();

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm font-medium text-[#1A73E8] hover:underline"
    >
      {translations[locale]}
    </button>
  );
}
