import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFlags, saveFlags } from "@/lib/featureFlags.server";
import { SESSION_COOKIE, isValidSession } from "@/lib/admin/auth";
import type { FeatureFlags } from "@/lib/featureFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read — the tool calls this to know which features to render.
export async function GET() {
  const flags = await getFlags();
  return NextResponse.json(flags);
}

// Admin-only write — toggling tool visibility / individual features.
export async function PUT(request: Request) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Partial<FeatureFlags> | null = null;
  try {
    body = (await request.json()) as Partial<FeatureFlags>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const updated = await saveFlags(body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to save" }, { status: 500 });
  }
}
