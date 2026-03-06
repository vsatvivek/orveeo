"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { linkWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuth } from "@/providers/firebase-auth-provider";
import { useAuthLocale } from "@/contexts/auth-locale";
import { SignoutButton } from "@/components/signout-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const hasPasswordProvider = (providerData: { providerId: string }[]) =>
  providerData.some((p) => p.providerId === "password");

const hasGoogleProvider = (providerData: { providerId: string }[]) =>
  providerData.some((p) => p.providerId === "google.com");

const translations = {
  it: {
    loading: "Caricamento...",
    addPasswordTitle: "Aggiungi password per accedere con email",
    addPasswordDesc: "Hai effettuato l'accesso con Google. Aggiungi una password per accedere anche con email e password.",
    password: "Password",
    passwordMin: "Min. 6 caratteri",
    confirmPassword: "Conferma password",
    passwordRequired: "La password deve essere di almeno 6 caratteri",
    passwordsDoNotMatch: "Le password non coincidono",
    addPassword: "Aggiungi password",
    adding: "Aggiunta in corso...",
    later: "Dopo",
    passwordAdded: "Password aggiunta con successo. Ora puoi accedere con email e password.",
    linkGoogleTitle: "Collega account Google",
    linkGoogleDesc: "Aggiungi l'accesso con Google al tuo account. Dopo il collegamento potrai accedere con email/password o Google.",
    linkGoogle: "Collega account Google",
    linking: "Collegamento...",
    linkGoogleSuccess: "Account Google collegato con successo. Ora puoi accedere con entrambi i metodi.",
    popupClosed: "Popup chiuso. Riprova.",
    googleAlreadyLinked: "Questo account Google è già collegato a un altro utente.",
    linkFailed: "Collegamento non riuscito",
    syncFailed: "Sincronizzazione non riuscita",
    unexpectedState: "Stato imprevisto. Esci e accedi con Google.",
    welcome: "Benvenuto",
    user: "Utente",
    dashboardDesc: "La tua dashboard per gestire gli appuntamenti dal barbiere sarà disponibile a breve.",
    signedIn: "Hai effettuato l'accesso con successo. L'applicazione è pronta per essere estesa con le funzionalità di prenotazione.",
  },
  en: {
    loading: "Loading...",
    addPasswordTitle: "Add password to sign in with email",
    addPasswordDesc: "You signed in with Google. Add a password to also sign in with your email and password.",
    password: "Password",
    passwordMin: "Min. 6 characters",
    confirmPassword: "Confirm password",
    passwordRequired: "Password must be at least 6 characters",
    passwordsDoNotMatch: "Passwords do not match",
    addPassword: "Add password",
    adding: "Adding...",
    later: "Later",
    passwordAdded: "Password added successfully. You can now sign in with email and password.",
    linkGoogleTitle: "Link Google account",
    linkGoogleDesc: "Add Google sign-in to your account. After linking, you can sign in with either email/password or Google.",
    linkGoogle: "Link Google account",
    linking: "Linking...",
    linkGoogleSuccess: "Google account linked successfully. You can now sign in with either method.",
    popupClosed: "Popup closed. Please try again.",
    googleAlreadyLinked: "This Google account is already linked to another user.",
    linkFailed: "Failed to link Google",
    syncFailed: "Failed to sync",
    unexpectedState: "Unexpected state. Please try signing out and signing in with Google first.",
    welcome: "Welcome",
    user: "User",
    dashboardDesc: "Your dashboard for managing barber appointments will be available soon.",
    signedIn: "You have signed in successfully. The application is ready to be extended with booking features.",
  },
} as const;

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { locale } = useAuthLocale();
  const router = useRouter();
  const t = translations[locale];
  const [dbVerified, setDbVerified] = useState<boolean | null>(null);
  const [addPasswordLoading, setAddPasswordLoading] = useState(false);
  const [addPasswordError, setAddPasswordError] = useState("");
  const [addPasswordSuccess, setAddPasswordSuccess] = useState(false);
  const [addPasswordDismissed, setAddPasswordDismissed] = useState(false);
  const [linkGoogleLoading, setLinkGoogleLoading] = useState(false);
  const [linkGoogleError, setLinkGoogleError] = useState("");
  const [linkGoogleSuccess, setLinkGoogleSuccess] = useState(false);

  const needsPassword = user && !hasPasswordProvider(user.providerData) && !addPasswordSuccess && !addPasswordDismissed;
  const needsGoogleLink = user && hasPasswordProvider(user.providerData) && !hasGoogleProvider(user.providerData) && !linkGoogleSuccess;

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (!loading && user) {
      user.getIdToken().then((idToken) => {
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${idToken}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.needsSync && data.firebaseUid) {
              fetch("/api/auth/sync-google", {
                method: "POST",
                headers: { Authorization: `Bearer ${idToken}` },
              }).then(() => setDbVerified(true));
              return;
            }
            if (data.user) {
              setDbVerified(data.user.emailVerified);
              if (
                user.providerData[0]?.providerId === "password" &&
                !data.user.emailVerified
              ) {
                router.replace(
                  `/verify-email?email=${encodeURIComponent(user.email ?? "")}`
                );
              }
            } else {
              setDbVerified(true);
            }
          })
          .catch(() => setDbVerified(true));
      });
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  if (
    user.providerData[0]?.providerId === "password" &&
    dbVerified === false
  ) {
    return null;
  }

  if (
    user.providerData[0]?.providerId === "password" &&
    dbVerified === null
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">Orveeo</h1>
            <a href="/api-docs" className="text-sm text-gray-500 hover:text-gray-700">API Docs</a>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.displayName || user.email}
            </span>
            <SignoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {needsPassword && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              {t.addPasswordTitle}
            </h3>
            <p className="text-sm text-amber-800 mb-4">
              {t.addPasswordDesc}
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const password = (form.elements.namedItem("add-password") as HTMLInputElement)?.value;
                const confirm = (form.elements.namedItem("add-password-confirm") as HTMLInputElement)?.value;
                if (!password || password.length < 6) {
                  setAddPasswordError(t.passwordRequired);
                  return;
                }
                if (password !== confirm) {
                  setAddPasswordError(t.passwordsDoNotMatch);
                  return;
                }
                setAddPasswordError("");
                setAddPasswordLoading(true);
                try {
                  const idToken = await user!.getIdToken();
                  const res = await fetch("/api/auth/set-password", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({ password }),
                  });
                  const json = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setAddPasswordError(json.error || t.syncFailed);
                    return;
                  }
                  setAddPasswordSuccess(true);
                } finally {
                  setAddPasswordLoading(false);
                }
              }}
              className="space-y-4 max-w-sm"
            >
              <div className="space-y-2">
                <Label htmlFor="add-password">{t.password}</Label>
                <PasswordInput
                  id="add-password"
                  name="add-password"
                  placeholder={t.passwordMin}
                  className="h-10"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password-confirm">{t.confirmPassword}</Label>
                <PasswordInput
                  id="add-password-confirm"
                  name="add-password-confirm"
                  placeholder={t.confirmPassword}
                  className="h-10"
                  required
                  minLength={6}
                />
              </div>
              {addPasswordError && (
                <p className="text-sm text-red-600">{addPasswordError}</p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={addPasswordLoading}>
                  {addPasswordLoading ? t.adding : t.addPassword}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddPasswordDismissed(true)}
                  disabled={addPasswordLoading}
                >
                  {t.later}
                </Button>
              </div>
            </form>
          </div>
        )}
        {addPasswordSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-green-800">
              {t.passwordAdded}
            </p>
          </div>
        )}
        {needsGoogleLink && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              {t.linkGoogleTitle}
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              {t.linkGoogleDesc}
            </p>
            {linkGoogleError && (
              <p className="text-sm text-red-600 mb-4">{linkGoogleError}</p>
            )}
            <Button
              onClick={async () => {
                if (!user) return;
                setLinkGoogleError("");
                setLinkGoogleLoading(true);
                try {
                  const result = await linkWithPopup(user, new GoogleAuthProvider());
                  const idToken = await result.user.getIdToken();
                  const res = await fetch("/api/auth/sync-google", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${idToken}` },
                  });
                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    if (json.linkRequired) {
                      setLinkGoogleError(t.unexpectedState);
                    } else {
                      setLinkGoogleError(json.error || t.syncFailed);
                    }
                    return;
                  }
                  setLinkGoogleSuccess(true);
                } catch (err) {
                  const code = (err as { code?: string })?.code;
                  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
                    setLinkGoogleError(t.popupClosed);
                  } else if (code === "auth/credential-already-in-use") {
                    setLinkGoogleError(t.googleAlreadyLinked);
                  } else {
                    setLinkGoogleError((err as Error)?.message || t.linkFailed);
                  }
                } finally {
                  setLinkGoogleLoading(false);
                }
              }}
              disabled={linkGoogleLoading}
            >
              {linkGoogleLoading ? t.linking : t.linkGoogle}
            </Button>
          </div>
        )}
        {linkGoogleSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-green-800">
              {t.linkGoogleSuccess}
            </p>
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t.welcome}, {user.displayName || t.user}!
        </h2>
        <p className="text-gray-600 mb-8">
          {t.dashboardDesc}
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-500">
            {t.signedIn}
          </p>
        </div>
      </main>
    </div>
  );
}
