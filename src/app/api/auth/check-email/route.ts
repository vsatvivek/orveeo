import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email || typeof email !== "string") {
    return NextResponse.json({ hasCredentials: false }, { status: 200 });
  }

  const result = await authService.checkEmailHasCredentials(email);
  return NextResponse.json(result);
}
