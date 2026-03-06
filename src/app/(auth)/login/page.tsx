"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  signOut,
  GoogleAuthProvider,
} from "firebase/auth";
import type { OAuthCredential } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/providers/firebase-auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthFooter } from "@/components/auth-footer";
import { useAuthLocale } from "@/contexts/auth-locale";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const translations = {
  it: {
    title: "Accedi a Orveeo",
    subtitle: "Accedi per prenotare e gestire i tuoi appuntamenti",
    email: "Email",
    emailPlaceholder: "Inserisci la tua email",
    password: "Password",
    passwordPlaceholder: "Inserisci la password",
    forgotPassword: "Hai dimenticato la password?",
    submit: "Accedi",
    loading: "Accesso in corso...",
    checkingAuth: "Caricamento...",
    googleSignIn: "Continua con Google",
    noAccount: "Non hai ancora un account?",
    register: "Registrati",
    resetSuccess: "Password reimpostata con successo. Ora puoi accedere.",
    verifiedSuccess: "Email verificata! Ora puoi accedere.",
    errorInvalidCreds: "Email o password non corretti",
    errorGeneric: "Errore durante l'accesso",
    errorGoogle: "Errore durante l'accesso con Google",
    errorGoogleUnauthorized: "Dominio non autorizzato. Aggiungi questo dominio in Firebase Console > Authentication > Authorized domains.",
    errorGooglePopupClosed: "Accesso annullato. Riprova.",
    linkPrompt: "Inserisci la password per collegare Google al tuo account (entrambi funzioneranno).",
    linkHint: "Hai un account? Inserisci la tua email sopra, poi clicca Continua con Google per collegare entrambi.",
    linkSubmit: "Collega e accedi",
  },
  en: {
    title: "Sign in to Orveeo",
    subtitle: "Sign in to book and manage your appointments",
    email: "Email",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    forgotPassword: "Forgot your password?",
    submit: "Sign in",
    loading: "Signing in...",
    checkingAuth: "Loading...",
    googleSignIn: "Continue with Google",
    noAccount: "Don't have an account yet?",
    register: "Register",
    resetSuccess: "Password reset successfully. You can now sign in.",
    verifiedSuccess: "Email verified! You can now sign in.",
    errorInvalidCreds: "Invalid email or password",
    errorGeneric: "Error signing in",
    errorGoogle: "Error signing in with Google",
    errorGoogleUnauthorized: "Unauthorized domain. Add this domain in Firebase Console > Authentication > Authorized domains.",
    errorGooglePopupClosed: "Sign-in cancelled. Please try again.",
    linkPrompt: "Enter your password to link Google to your account (both will work).",
    linkHint: "Have an account? Enter your email above, then click Continue with Google to link both.",
    linkSubmit: "Link and sign in",
  },
} as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const { locale } = useAuthLocale();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkRequiredEmail, setLinkRequiredEmail] = useState<string | null>(null);
  const [pendingCredential, setPendingCredential] = useState<OAuthCredential | null>(null);
  const [linkFirstEmail, setLinkFirstEmail] = useState<string | null>(null);

  const t = translations[locale];

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!authLoading && authUser) {
      router.replace("/dashboard");
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    const reset = searchParams.get("reset");
    const verified = searchParams.get("verified");
    if (reset === "success") setSuccess(t.resetSuccess);
    else if (verified === "success") setSuccess(t.verifiedSuccess);
  }, [searchParams, t.resetSuccess, t.verifiedSuccess]);

  async function onSubmit(data: LoginInput) {
    setError("");
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not initialized");

      const { user } = await signInWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await user.getIdToken();

      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const meJson = await meRes.json();

      if (meJson.user && !meJson.user.emailVerified) {
        router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        router.refresh();
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const message = (err as { code?: string })?.code;
      if (message === "auth/invalid-credential" || message === "auth/user-not-found" || message === "auth/wrong-password") {
        setError(t.errorInvalidCreds);
      } else {
        setError(t.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    setLinkRequiredEmail(null);
    setPendingCredential(null);
    setLinkFirstEmail(null);

    try {
      const email = getValues("email")?.trim()?.toLowerCase();
      if (email) {
        const checkRes = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        const checkJson = await checkRes.json().catch(() => ({}));
        if (checkJson.hasCredentials) {
          setLinkFirstEmail(email);
          setLoading(false);
          return;
        }
      }

      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not initialized");

      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = await result.user.getIdToken();

      const syncRes = await fetch("/api/auth/sync-google", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const syncJson = await syncRes.json().catch(() => ({}));

      if (syncJson.linkRequired && syncJson.email && credential) {
        await signOut(auth);
        setLinkRequiredEmail(syncJson.email);
        setPendingCredential(credential);
        setLoading(false);
        return;
      }

      if (!syncRes.ok) {
        throw new Error(syncJson.error || "Sync failed");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      const message = (err as Error)?.message || "";
      if (code === "auth/unauthorized-domain" || message.includes("unauthorized-domain")) {
        setError(t.errorGoogleUnauthorized);
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError(t.errorGooglePopupClosed);
      } else if (code === "auth/operation-not-allowed") {
        setError("Google sign-in is not enabled. Enable it in Firebase Console > Authentication > Sign-in method.");
      } else {
        console.error("Google sign-in error:", err);
        setError(t.errorGoogle);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkFirstWithPassword(password: string) {
    if (!linkFirstEmail) return;
    setError("");
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not initialized");

      const { user } = await signInWithEmailAndPassword(auth, linkFirstEmail, password);
      await linkWithPopup(user, new GoogleAuthProvider());
      const idToken = await user.getIdToken();

      const syncRes = await fetch("/api/auth/sync-google", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!syncRes.ok) {
        throw new Error("Sync failed");
      }

      setLinkFirstEmail(null);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError(t.errorInvalidCreds);
      } else if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError(t.errorGooglePopupClosed);
      } else {
        setError(t.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkWithPassword(password: string) {
    if (!linkRequiredEmail || !pendingCredential) return;
    setError("");
    setLoading(true);

    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Auth not initialized");

      const { user } = await signInWithEmailAndPassword(auth, linkRequiredEmail, password);
      await linkWithCredential(user, pendingCredential);
      const idToken = await user.getIdToken();

      const syncRes = await fetch("/api/auth/sync-google", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (!syncRes.ok) {
        throw new Error("Sync failed");
      }

      setLinkRequiredEmail(null);
      setPendingCredential(null);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError(t.errorInvalidCreds);
      } else {
        setError(t.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || authUser) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col flex-1 min-h-0 overflow-visible items-center justify-center">
        <p className="text-gray-500">{t.checkingAuth}</p>
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

        {linkFirstEmail ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const password = (form.elements.namedItem("link-first-password") as HTMLInputElement)?.value;
              if (password) handleLinkFirstWithPassword(password);
            }}
            className="mt-8 space-y-5"
          >
            <p className="text-sm text-gray-600">{t.linkPrompt}</p>
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t.email}</Label>
              <Input
                type="email"
                value={linkFirstEmail}
                readOnly
                className="h-12 rounded-md border-gray-300 bg-gray-50 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-first-password" className="text-base font-medium text-gray-900">
                {t.password}
              </Label>
              <PasswordInput
                id="link-first-password"
                name="link-first-password"
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-md border-gray-300 bg-white text-base"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLinkFirstEmail(null);
                  setError("");
                }}
                disabled={loading}
                className="flex-1 h-12 rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold"
              >
                {loading ? t.loading : t.linkSubmit}
              </Button>
            </div>
          </form>
        ) : linkRequiredEmail ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const password = (form.elements.namedItem("link-password") as HTMLInputElement)?.value;
              if (password) handleLinkWithPassword(password);
            }}
            className="mt-8 space-y-5"
          >
            <p className="text-sm text-gray-600">{t.linkPrompt}</p>
            <div className="space-y-2">
              <Label className="text-base font-medium text-gray-900">{t.email}</Label>
              <Input
                type="email"
                value={linkRequiredEmail}
                readOnly
                className="h-12 rounded-md border-gray-300 bg-gray-50 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-password" className="text-base font-medium text-gray-900">
                {t.password}
              </Label>
              <PasswordInput
                id="link-password"
                name="link-password"
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-md border-gray-300 bg-white text-base"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLinkRequiredEmail(null);
                  setPendingCredential(null);
                  setError("");
                }}
                disabled={loading}
                className="flex-1 h-12 rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold"
              >
                {loading ? t.loading : t.linkSubmit}
              </Button>
            </div>
          </form>
        ) : (
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-base font-medium text-gray-900"
              >
                {t.password}
              </Label>
              <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#1A73E8] hover:underline"
            >
              {t.forgotPassword}
            </Link>
            </div>
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

          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-md bg-[#1A73E8] hover:bg-[#1557b0] text-white font-semibold text-base"
          >
            {loading ? t.loading : t.submit}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 rounded-md border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t.googleSignIn}
          </Button>
          <p className="text-xs text-gray-500 mt-2">{t.linkHint}</p>
        </form>
        )}

        <p className="mt-8 text-center text-base text-gray-600">
          {t.noAccount}{" "}
          <Link
            href="/register"
            className="font-medium text-[#1A73E8] hover:underline"
          >
            {t.register}
          </Link>
        </p>
      </div>

      <AuthFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md mx-auto animate-pulse h-96 bg-gray-100 rounded" />}>
      <LoginForm />
    </Suspense>
  );
}
