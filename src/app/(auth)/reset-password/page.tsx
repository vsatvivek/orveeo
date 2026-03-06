"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthFooter } from "@/components/auth-footer";
import { useAuthLocale } from "@/contexts/auth-locale";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

const translations = {
  it: {
    title: "Crea nuova password",
    subtitle: "Hai cliccato il link nell'email. Inserisci la nuova password per il tuo account.",
    password: "Nuova password",
    passwordPlaceholder: "Min. 6 caratteri",
    confirmPassword: "Conferma password",
    confirmPlaceholder: "Conferma la password",
    submit: "Reimposta password",
    loading: "Salvataggio...",
    invalidTitle: "Link non valido",
    invalidSubtitle: "Il link per reimpostare la password non è valido o è scaduto. Richiedi un nuovo link.",
    requestNew: "Richiedi nuovo link",
    linkBack: "← Torna al login",
    invalidError: "Link non valido. Richiedi un nuovo link.",
    expiredError: "Link non valido o scaduto. Richiedi un nuovo link.",
    genericError: "Errore durante il reset. Riprova.",
  },
  en: {
    title: "Create new password",
    subtitle: "You clicked the link from your email. Enter your new password for your account.",
    password: "New password",
    passwordPlaceholder: "Min. 6 characters",
    confirmPassword: "Confirm password",
    confirmPlaceholder: "Confirm your password",
    submit: "Reset password",
    loading: "Saving...",
    invalidTitle: "Invalid link",
    invalidSubtitle: "The password reset link is invalid or has expired. Request a new link.",
    requestNew: "Request new link",
    linkBack: "← Back to login",
    invalidError: "Invalid link. Request a new link.",
    expiredError: "Invalid or expired link. Request a new link.",
    genericError: "Error resetting. Please try again.",
  },
} as const;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useAuthLocale();
  const token = searchParams.get("token");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = translations[locale];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setError("");

    if (!token) {
      setError(t.invalidError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || t.genericError);
        return;
      }

      router.push("/login?reset=success");
      router.refresh();
    } catch {
      setError(t.genericError);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t.invalidTitle}
          </h1>
          <p className="mt-2 text-base text-gray-600">
            {t.invalidSubtitle}
          </p>
          <Link href="/forgot-password" className="block mt-8">
            <Button className="w-full h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-base">
              {t.requestNew}
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
            <Label
              htmlFor="password"
              className="text-base font-medium text-gray-900"
            >
              {t.password}
            </Label>
            <PasswordInput
              id="password"
              placeholder={t.passwordPlaceholder}
              className="h-12 rounded-md border-gray-300 bg-white text-base"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-base font-medium text-gray-900"
            >
              {t.confirmPassword}
            </Label>
            <PasswordInput
              id="confirmPassword"
              placeholder={t.confirmPlaceholder}
              className="h-12 rounded-md border-gray-300 bg-white text-base"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md mx-auto flex items-center justify-center min-h-[200px]">
          <p className="text-gray-500">Caricamento...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
