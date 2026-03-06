import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { resetPasswordBodySchema } from "@/lib/validations/api-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordBodySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await authService.resetPassword(
      parsed.data.token,
      parsed.data.password
    );

    if (!result.success && "status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
