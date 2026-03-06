import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { FirebaseAuthProvider } from "@/providers/firebase-auth-provider";
import { AuthLocaleProvider } from "@/contexts/auth-locale";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orveeo - Prenota il tuo appuntamento",
  description: "Prenota e gestisci i tuoi appuntamenti dal barbiere",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <FirebaseAuthProvider>
          <AuthLocaleProvider>
            <QueryProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </QueryProvider>
          </AuthLocaleProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
