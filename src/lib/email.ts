import nodemailer from "nodemailer";

// Gmail app passwords are 16 chars; when copied they may include spaces - strip them
function getSmtpPass(): string {
  const pass = process.env.SMTP_PASS || "";
  return pass.replace(/\s/g, "");
}

function createTransporter() {
  const host = process.env.SMTP_HOST || "";
  const isGmail = host.includes("gmail.com");

  // Use nodemailer's Gmail service config - often more reliable than manual host/port
  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: getSmtpPass(),
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: getSmtpPass(),
    },
  });
}

const transporter = createTransporter();

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ success: true } | { success: false; skipped?: boolean; error?: unknown }> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("SMTP not configured. Email not sent:", { to, subject });
    return { success: false, skipped: true };
  }

  if (!process.env.SMTP_PASS) {
    console.warn("SMTP_PASS not set. Email not sent:", { to, subject });
    return { success: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html: html || text,
      text,
    });
    return { success: true };
  } catch (error) {
    const err = error as { code?: string; response?: string; responseCode?: number };
    console.error("Email send error:", {
      code: err?.code,
      response: err?.response,
      responseCode: err?.responseCode,
      message: err instanceof Error ? err.message : String(error),
    });
    return { success: false, error };
  }
}

export function getSmtpErrorMessage(error: unknown): string {
  if (!error) return "Failed to send verification email. Please try again.";
  const err = error as { code?: string; response?: string; message?: string };
  const msg = err?.message || err?.response || String(error);
  const code = err?.code?.toUpperCase() || "";

  if (code === "EAUTH" || msg.includes("Invalid login") || msg.includes("Username and Password not accepted")) {
    return "SMTP authentication failed. For Gmail, use an App Password (not your regular password). See: https://support.google.com/accounts/answer/185833";
  }
  if (msg.includes("Connection timeout") || msg.includes("ETIMEDOUT")) {
    return "Could not connect to email server. Check SMTP_HOST and SMTP_PORT, and ensure your firewall allows outbound connections.";
  }
  if (msg.includes("self signed certificate")) {
    return "Email server SSL certificate issue. Try SMTP_SECURE=false for port 587.";
  }

  return "Failed to send verification email. Please try again or contact support.";
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const displayName = name || "Utente";
  return sendEmail({
    to,
    subject: "Benvenuto su Orveeo",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1A73E8;">Benvenuto su Orveeo!</h1>
        <p>Ciao ${displayName},</p>
        <p>Grazie per esserti registrato. Ora puoi prenotare e gestire i tuoi appuntamenti dal barbiere.</p>
        <p>Accedi alla tua area riservata per iniziare.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login" 
           style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Accedi
        </a>
        <p style="margin-top: 32px; color: #666; font-size: 12px;">
          © 2026 Orveeo. Tutti i diritti riservati.
        </p>
      </div>
    `,
    text: `Benvenuto su Orveeo! Ciao ${displayName}, grazie per esserti registrato. Accedi a ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
  });
}

export async function sendVerificationEmail(to: string, verifyLink: string, name?: string) {
  const displayName = name || "Utente";
  return sendEmail({
    to,
    subject: "Verifica la tua email - Orveeo",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1A73E8;">Verifica la tua email</h1>
        <p>Ciao ${displayName},</p>
        <p>Grazie per esserti registrato su Orveeo. Clicca sul pulsante qui sotto per verificare il tuo indirizzo email e attivare il tuo account.</p>
        <a href="${verifyLink}" 
           style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Verifica email
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Il link scade tra 24 ore. Se non hai richiesto questa registrazione, puoi ignorare questa email.
        </p>
        <p style="margin-top: 32px; color: #666; font-size: 12px;">
          © 2026 Orveeo. Tutti i diritti riservati.
        </p>
      </div>
    `,
    text: `Verifica la tua email: ${verifyLink}. Il link scade tra 24 ore.`,
  });
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  return sendEmail({
    to,
    subject: "Reimposta la tua password - Orveeo",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1A73E8;">Reimposta la password</h1>
        <p>Hai richiesto di reimpostare la password del tuo account Orveeo.</p>
        <p>Clicca sul pulsante qui sotto per impostare una nuova password. Il link scade tra 1 ora.</p>
        <a href="${resetLink}" 
           style="display: inline-block; background: #1A73E8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Reimposta password
        </a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          Se non hai richiesto questa email, puoi ignorarla. La tua password non verrà modificata.
        </p>
        <p style="margin-top: 32px; color: #666; font-size: 12px;">
          © 2026 Orveeo. Tutti i diritti riservati.
        </p>
      </div>
    `,
    text: `Reimposta la password: ${resetLink}. Il link scade tra 1 ora.`,
  });
}
