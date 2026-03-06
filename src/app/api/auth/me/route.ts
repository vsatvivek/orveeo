import { NextResponse } from "next/server";
import { authService } from "@/services/auth.service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.replace("Bearer ", "");

  if (!idToken) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const result = await authService.getMe(idToken);
  return NextResponse.json(result);
}
