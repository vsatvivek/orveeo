"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthFooter } from "@/components/auth-footer";
import { useAuthLocale } from "@/contexts/auth-locale";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

const translations = {
  it: {
    title: "Hai dimenticato la password?",
    subtitle: "Inserisci la tua email e ti invieremo un link per reimpostare la password",
    email: "Email",
    emailPlaceholder: "Inserisci la tua email",
    submit: "Invia link",
    loading: "Invio in corso...",
    successTitle: "Controlla la tua email",
    successSubtitle: "Se esiste un account con questa email, riceverai un link per reimpostare la password. Controlla anche la cartella spam.",
    backToLogin: "Torna al login",
    linkBack: "← Torna al login",
    error: "Errore durante l'invio. Riprova più tardi.",
  },
  en: {
    title: "Forgot your password?",
    subtitle: "Enter your email and we'll send you a link to reset your password",
    email: "Email",
    emailPlaceholder: "Enter your email",
    submit: "Send link",
    loading: "Sending...",
    successTitle: "Check your email",
    successSubtitle: "If an account exists with this email, you will receive a reset link. Check your spam folder too.",
    backToLogin: "Back to login",
    linkBack: "← Back to login",
    error: "Error sending. Please try again.",
  },
} as const;

export default function ForgotPasswordPage() {
  const { locale } = useAuthLocale();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = translations[locale];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (!res.ok) {
        setError(t.error);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t.successTitle}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {t.successSubtitle}
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

  return (
    <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible">
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t.title}
        </h1>
        <p className="mt-2 text-base text-gray-600">
          {t.subtitle}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-medium text-gray-900">
              {t.email}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t.emailPlaceholder}
              className="h-12 rounded-md border-gray-300 bg-white text-base"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-base"
          >
            {loading ? t.loading : t.submit}
          </Button>
        </form>

        <p className="mt-8 text-center text-base text-gray-600">
          <Link
            href="/login"
            className="font-medium text-[#1A73E8] hover:underline"
          >
            {t.linkBack}
          </Link>
        </p>
      </div>

      <AuthFooter />
    </div>
  );
}
