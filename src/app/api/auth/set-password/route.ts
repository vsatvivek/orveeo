import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.replace("Bearer ", "");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const password = body.password;
  if (typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  try {
    const result = await authService.setPassword(idToken, password);

    if (!result.success && "status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
