import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.replace("Bearer ", "");

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await authService.syncGoogle(idToken);

    if (!result.success && "status" in result) {
      if ("linkRequired" in result && result.linkRequired) {
        return NextResponse.json(
          { linkRequired: true, email: result.email },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Sync Google error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
