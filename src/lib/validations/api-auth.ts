import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  name: z.string().max(100).optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const resendVerificationBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type ResendVerificationBody = z.infer<typeof resendVerificationBodySchema>;
