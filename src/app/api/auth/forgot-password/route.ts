import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { forgotPasswordBodySchema } from "@/lib/validations/api-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordBodySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await authService.forgotPassword(parsed.data.email);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
