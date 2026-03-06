import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";
import { registerBodySchema } from "@/lib/validations/api-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerBodySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await authService.register({
      email: parsed.data.email,
      name: parsed.data.name ?? null,
      password: parsed.data.password,
    });

    if (!result.success && "status" in result) {
      const body: { error: string; details?: string } = { error: result.error ?? "An error occurred" };
      if ("details" in result && result.details) {
        body.details = result.details;
      }
      return NextResponse.json(body, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
