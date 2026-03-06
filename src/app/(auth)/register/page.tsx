"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
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
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

const translations = {
  it: {
    title: "Registrati su Orveeo",
    subtitle: "Crea un account per prenotare e gestire i tuoi appuntamenti",
    name: "Nome",
    namePlaceholder: "Inserisci il tuo nome",
    email: "Email",
    emailPlaceholder: "Inserisci la tua email",
    password: "Password",
    passwordPlaceholder: "Min. 6 caratteri",
    submit: "Registrati",
    loading: "Registrazione...",
    googleSignIn: "Continua con Google",
    hasAccount: "Hai già un account?",
    login: "Accedi",
    errorEmailExists: "Un account con questa email esiste già",
    errorGeneric: "Errore durante la registrazione",
    errorGoogle: "Errore durante la registrazione con Google",
    errorGoogleUnauthorized: "Dominio non autorizzato. Aggiungi questo dominio in Firebase Console > Authentication > Authorized domains.",
    errorGooglePopupClosed: "Registrazione annullata. Riprova.",
    linkPrompt: "Un account con questa email esiste già. Inserisci la password per collegare il tuo account Google.",
    linkSubmit: "Collega e accedi",
    linkLoading: "Collegamento...",
    errorInvalidCreds: "Email o password non corretti",
    checkingAuth: "Caricamento...",
  },
  en: {
    title: "Sign up for Orveeo",
    subtitle: "Create an account to book and manage your appointments",
    name: "Name",
    namePlaceholder: "Enter your name",
    email: "Email",
    emailPlaceholder: "Enter your email",
    password: "Password",
    passwordPlaceholder: "Min. 6 characters",
    submit: "Sign up",
    loading: "Signing up...",
    googleSignIn: "Continue with Google",
    hasAccount: "Already have an account?",
    login: "Sign in",
    errorEmailExists: "An account with this email already exists",
    errorGeneric: "Error signing up",
    errorGoogle: "Error signing up with Google",
    errorGoogleUnauthorized: "Unauthorized domain. Add this domain in Firebase Console > Authentication > Authorized domains.",
    errorGooglePopupClosed: "Sign-up cancelled. Please try again.",
    linkPrompt: "An account with this email already exists. Enter your password to link your Google account.",
    linkSubmit: "Link and sign in",
    linkLoading: "Linking...",
    errorInvalidCreds: "Invalid email or password",
    checkingAuth: "Loading...",
  },
} as const;

export default function RegisterPage() {
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();
  const { locale } = useAuthLocale();
  const [error, setError] = useState("");
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
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    if (!authLoading && authUser) {
      router.replace("/dashboard");
    }
  }, [authUser, authLoading, router]);

  async function onSubmit(data: RegisterInput) {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          name: data.name || null,
          password: data.password,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setError(json.details ? `${t.errorEmailExists} (${json.details})` : t.errorEmailExists);
        } else {
          setError(json.error || t.errorGeneric);
        }
        return;
      }

      router.push(`/verify-email-sent?email=${encodeURIComponent(data.email)}`);
      router.refresh();
    } catch {
      setError(t.errorGeneric);
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
                {loading ? t.linkLoading : t.linkSubmit}
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
                {loading ? t.linkLoading : t.linkSubmit}
              </Button>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-medium text-gray-900">
              {t.name}
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={t.namePlaceholder}
              className="h-12 rounded-md border-gray-300 bg-white text-base"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

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
            <Label htmlFor="password" className="text-base font-medium text-gray-900">
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

          {error && <p className="text-sm text-red-600">{error}</p>}

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
        </form>
        )}

        <p className="mt-8 text-center text-base text-gray-600">
          {t.hasAccount}{" "}
          <Link
            href="/login"
            className="font-medium text-[#1A73E8] hover:underline"
          >
            {t.login}
          </Link>
        </p>
      </div>

      <AuthFooter />
    </div>
  );
}
