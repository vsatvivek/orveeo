"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuthFooter } from "@/components/auth-footer";
import { useAuthLocale } from "@/contexts/auth-locale";

const translations = {
  it: {
    title: "Verifica la tua email",
    subtitle: "Ti abbiamo inviato un link di verifica a",
    subtitle2: "Clicca sul link nell'email per attivare il tuo account.",
    checkSpam: "Non vedi l'email? Controlla la cartella spam.",
    resend: "Invia di nuovo il link",
    resendSuccess: "Link inviato! Controlla la tua email.",
    resendError: "Errore durante l'invio. Riprova più tardi.",
    backToLogin: "Torna al login",
  },
  en: {
    title: "Verify your email",
    subtitle: "We've sent a verification link to",
    subtitle2: "Click the link in the email to activate your account.",
    checkSpam: "Can't find the email? Check your spam folder.",
    resend: "Resend verification link",
    resendSuccess: "Link sent! Check your email.",
    resendError: "Error sending. Please try again.",
    backToLogin: "Back to login",
  },
} as const;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { locale } = useAuthLocale();
  const email = searchParams.get("email") ?? "";
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  const t = translations[locale];
  const displayEmail = email || "your email";

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setResendStatus("idle");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json();
      if (res.ok) {
        setResendStatus("success");
      } else {
        setResendStatus("error");
      }
    } catch {
      setResendStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t.title}
        </h1>
        <p className="mt-2 text-base text-gray-600">
          {t.subtitle} <span className="font-medium text-gray-900">{displayEmail}</span>
        </p>
        <p className="mt-2 text-base text-gray-600">
          {t.subtitle2}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {t.checkSpam}
        </p>

        {email && (
          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={loading}
            className="mt-6 w-full h-12 rounded-md border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
          >
            {loading ? "..." : t.resend}
          </Button>
        )}

        <Link href="/login" className="block mt-4">
          <Button className="w-full h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-base">
            {t.backToLogin}
          </Button>
        </Link>

        {resendStatus === "success" && (
          <p className="mt-4 text-sm text-green-600">{t.resendSuccess}</p>
        )}
        {resendStatus === "error" && (
          <p className="mt-4 text-sm text-red-600">{t.resendError}</p>
        )}
      </div>

      <AuthFooter />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto animate-pulse h-96 bg-gray-100 rounded" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
