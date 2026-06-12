import { NextResponse } from "next/server";
import { checkCredentials, SESSION_COOKIE, SESSION_TOKEN, SESSION_MAX_AGE } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = await request.json();
    username = String(body?.username ?? "");
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
