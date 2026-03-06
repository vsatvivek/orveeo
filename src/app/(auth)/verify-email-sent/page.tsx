"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthFooter } from "@/components/auth-footer";
import { useAuthLocale } from "@/contexts/auth-locale";

const translations = {
  it: {
    title: "Controlla la tua email",
    subtitle: "Ti abbiamo inviato un link di verifica a",
    subtitle2: "Clicca sul link nell'email per verificare il tuo account e accedere.",
    checkSpam: "Non vedi l'email? Controlla la cartella spam.",
    backToLogin: "Torna al login",
  },
  en: {
    title: "Check your email",
    subtitle: "We've sent a verification link to",
    subtitle2: "Click the link in the email to verify your account and sign in.",
    checkSpam: "Can't find the email? Check your spam folder.",
    backToLogin: "Back to login",
  },
} as const;

function VerifyEmailSentContent() {
  const searchParams = useSearchParams();
  const { locale } = useAuthLocale();
  const email = searchParams.get("email") ?? "";

  const t = translations[locale];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t.title}
        </h1>
        <p className="mt-2 text-base text-gray-600">
          {t.subtitle} <span className="font-medium text-gray-900">{email || "your email"}</span>
        </p>
        <p className="mt-2 text-base text-gray-600">
          {t.subtitle2}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {t.checkSpam}
        </p>

        <Link href="/login" className="block mt-8">
          <Button className="w-full h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-base">
            {t.backToLogin}
          </Button>
        </Link>
      </div>

      <AuthFooter />
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto animate-pulse h-96 bg-gray-100 rounded" />}>
      <VerifyEmailSentContent />
    </Suspense>
  );
}
