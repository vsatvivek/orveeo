import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  try {
    const result = await authService.verifyEmail(token);

    if (!result.success) {
      const error = "error" in result ? result.error : "expired_token";
      return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
    }

    return NextResponse.redirect(new URL("/login?verified=success", request.url));
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.redirect(new URL("/login?error=verification_failed", request.url));
  }
}
