import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { sendVerificationEmail, sendPasswordResetEmail, isSmtpConfigured, getSmtpErrorMessage } from "@/lib/email";
import { generateSecureToken } from "@/lib/auth";
import {
  userRepository,
  accountRepository,
  verificationTokenRepository,
  passwordResetTokenRepository,
} from "@/db/repositories";

const VERIFICATION_EXPIRY_HOURS = 24;
const RESET_EXPIRY_HOURS = 1;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authService = {
  async register(input: { email: string; name: string | null; password: string }) {
    const email = input.email.trim().toLowerCase();
    const name = input.name?.trim() ?? null;

    if (!isSmtpConfigured()) {
      return {
        success: false,
        error: "Email service is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment.",
        status: 503 as const,
      };
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists",
        details: "User exists in database (users table). Delete the row to re-register.",
        status: 409 as const,
      };
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return { success: false, error: "Server configuration error", status: 500 as const };
    }

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password: input.password,
        displayName: name ?? undefined,
        emailVerified: false,
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        return {
          success: false,
          error: "An account with this email already exists",
          details: "User exists in Firebase Authentication. Delete from Firebase Console > Authentication > Users.",
          status: 409 as const,
        };
      }
      throw err;
    }

    const [newUser] = await userRepository.create({
      email,
      name,
      passwordHash: null,
      emailVerified: null,
    });

    if (!newUser) {
      await admin.auth().deleteUser(firebaseUser.uid);
      return { success: false, error: "Failed to create user", status: 500 as const };
    }

    await accountRepository.create({
      userId: newUser.id,
      type: "credentials",
      provider: "firebase",
      providerAccountId: firebaseUser.uid,
    });

    const token = generateSecureToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + VERIFICATION_EXPIRY_HOURS);
    await verificationTokenRepository.create(email, token, expires);

    const verifyLink = `${APP_URL}/api/auth/verify-email?token=${token}`;
    const emailResult = await sendVerificationEmail(email, verifyLink, name ?? undefined);

    if (!emailResult.success) {
      await admin.auth().deleteUser(firebaseUser.uid);
      await userRepository.deleteById(newUser.id);
      await verificationTokenRepository.deleteByIdentifierAndToken(email, token);
      if (emailResult.skipped) {
        return {
          success: false,
          error: "Unable to send verification email. Please check SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS).",
          status: 503 as const,
        };
      }
      const errMsg = getSmtpErrorMessage(emailResult.error);
      return {
        success: false,
        error: errMsg,
        status: 500 as const,
      };
    }

    return {
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
    };
  },

  async verifyEmail(token: string) {
    const [vt] = await verificationTokenRepository.findByToken(token);
    if (!vt || vt.expires < new Date()) {
      return { success: false, error: "expired_token" as const };
    }

    await userRepository.markEmailVerified(vt.identifier);
    await verificationTokenRepository.deleteByIdentifierAndToken(vt.identifier, token);

    return { success: true };
  },

  async resendVerification(email: string) {
    if (!isSmtpConfigured()) {
      return {
        success: false,
        error: "Email service is not configured.",
        status: 503 as const,
      };
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(trimmedEmail);

    if (!user) {
      return { success: false, error: "User not found", status: 404 as const };
    }
    if (user.emailVerified) {
      return { success: false, error: "Email already verified", status: 400 as const };
    }

    await verificationTokenRepository.deleteByIdentifier(trimmedEmail);

    const token = generateSecureToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + VERIFICATION_EXPIRY_HOURS);
    await verificationTokenRepository.create(trimmedEmail, token, expires);

    const verifyLink = `${APP_URL}/api/auth/verify-email?token=${token}`;
    const emailResult = await sendVerificationEmail(trimmedEmail, verifyLink, user.name ?? undefined);

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.skipped
          ? "Unable to send verification email. Please check SMTP configuration."
          : "Failed to send verification email. Please try again.",
        status: emailResult.skipped ? (503 as const) : (500 as const),
      };
    }

    return { success: true, message: "Verification email sent." };
  },

  async forgotPassword(email: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(trimmedEmail);

    if (!user) {
      return { success: true, message: "If an account exists with this email, you will receive a reset link." };
    }

    const [firebaseAccount] = await accountRepository.findByUserIdAndProvider(user.id, "firebase");
    if (!firebaseAccount) {
      return { success: true, message: "If an account exists with this email, you will receive a reset link." };
    }

    if (!isSmtpConfigured()) {
      return {
        success: false,
        error: "Email service is not configured. Please contact support.",
        status: 503 as const,
      };
    }

    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_EXPIRY_HOURS);
    await passwordResetTokenRepository.create(user.id, token, expiresAt);

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    const emailResult = await sendPasswordResetEmail(trimmedEmail, resetLink);

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.skipped
          ? "Unable to send password reset email. Please check SMTP configuration."
          : getSmtpErrorMessage(emailResult.error),
        status: emailResult.skipped ? (503 as const) : (500 as const),
      };
    }

    return { success: true, message: "If an account exists with this email, you will receive a reset link." };
  },

  async resetPassword(token: string, password: string) {
    const [resetRecord] = await passwordResetTokenRepository.findByToken(token);
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return { success: false, error: "Invalid or expired reset link. Please request a new one.", status: 400 as const };
    }

    const user = await userRepository.findById(resetRecord.userId);
    if (!user) {
      return { success: false, error: "User not found", status: 400 as const };
    }

    const [firebaseAccount] = await accountRepository.findByUserIdAndProvider(user.id, "firebase");
    if (!firebaseAccount) {
      return { success: false, error: "Invalid account type", status: 400 as const };
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return { success: false, error: "Server configuration error", status: 500 as const };
    }

    await admin.auth().updateUser(firebaseAccount.providerAccountId, { password });
    await passwordResetTokenRepository.deleteById(resetRecord.id);

    return { success: true, message: "Password updated successfully." };
  },

  async getMe(idToken: string) {
    const admin = getFirebaseAdmin();
    if (!admin) return { user: null };

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decoded.uid;

      const [account] = await accountRepository.findByFirebaseUid(firebaseUid);
      if (!account) {
        return {
          user: null,
          needsSync: true,
          firebaseUid,
          email: decoded.email,
          name: decoded.name,
        };
      }

      const user = await userRepository.findById(account.userId);
      if (!user) return { user: null };

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: !!user.emailVerified,
        },
      };
    } catch {
      return { user: null };
    }
  },

  async syncGoogle(idToken: string) {
    const admin = getFirebaseAdmin();
    if (!admin) {
      return { success: false, error: "Server error", status: 500 as const };
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name ?? null;

    if (!email) {
      return { success: false, error: "No email in token", status: 400 as const };
    }

    const [existingAccount] = await accountRepository.findByFirebaseUid(firebaseUid);
    if (existingAccount) {
      return { success: true, synced: true };
    }

    const user = await userRepository.findByEmail(email.toLowerCase());
    if (user) {
      const [credentialsAccount] = await accountRepository.findByUserIdProviderAndType(
        user.id,
        "firebase",
        "credentials"
      );
      if (credentialsAccount) {
        return {
          success: false,
          linkRequired: true,
          email: user.email,
          status: 400 as const,
        };
      }
    }

    let userToSync = user;
    if (!userToSync) {
      const [newUser] = await userRepository.create({
        email: email.toLowerCase(),
        name,
        emailVerified: new Date(),
      });
      userToSync = newUser!;
    } else {
      if (!userToSync.emailVerified) {
        await userRepository.markEmailVerified(userToSync.email);
      }
    }

    await accountRepository.create({
      userId: userToSync.id,
      type: "oauth",
      provider: "firebase",
      providerAccountId: firebaseUid,
    });

    return { success: true, synced: true };
  },

  async checkEmailHasCredentials(email: string) {
    const trimmed = email?.trim()?.toLowerCase();
    if (!trimmed) return { hasCredentials: false };
    const user = await userRepository.findByEmail(trimmed);
    if (!user) return { hasCredentials: false };
    const [credentialsAccount] = await accountRepository.findByUserIdProviderAndType(
      user.id,
      "firebase",
      "credentials"
    );
    return { hasCredentials: !!credentialsAccount };
  },

  async setPassword(idToken: string, password: string) {
    const admin = getFirebaseAdmin();
    if (!admin) {
      return { success: false, error: "Server configuration error", status: 500 as const };
    }

    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters", status: 400 as const };
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      const firebaseUid = decoded.uid;

      const [account] = await accountRepository.findByFirebaseUid(firebaseUid);
      if (!account) {
        return { success: false, error: "Account not found", status: 404 as const };
      }

      await admin.auth().updateUser(firebaseUid, { password });
      return { success: true, message: "Password added successfully." };
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/weak-password") {
        return { success: false, error: "Password is too weak", status: 400 as const };
      }
      throw err;
    }
  },
};
