import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFlags, saveFlags } from "@/lib/featureFlags.server";
import { SESSION_COOKIE, isValidSession } from "@/lib/admin/auth";
import type { FeatureFlags } from "@/lib/featureFlags";
import { createClient } from "@/utils/supabase/server";
import { getDbPool, ensureUserConfigTable } from "@/lib/db";
import { FEATURE_META, PATTERN_CATALOG, THEME_CATALOG } from "@/lib/featureFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public read — the tool calls this to know which features to render.
export async function GET() {
  const flags = await getFlags();

  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await ensureUserConfigTable();
      const pool = getDbPool();
      const { rows } = await pool.query(
        "SELECT tool_enabled, status, features, patterns, themes FROM public.user_config WHERE user_id = $1;",
        [user.id]
      );
      if (rows.length > 0) {
        const ucfg = rows[0];
        
        const toolEnabledOverride = ucfg.tool_enabled !== false && ucfg.status !== "Suspended";
        
        const featuresOverride = { ...flags.features };
        FEATURE_META.forEach((f) => {
          const val = ucfg.features?.[f.key];
          (featuresOverride as any)[f.key] = val !== false;
        });

        const patternsOverride = { ...flags.patterns };
        PATTERN_CATALOG.forEach((p) => {
          const val = ucfg.patterns?.[p.id];
          (patternsOverride as any)[p.id] = val !== false;
        });

        const themesOverride = { ...flags.themes };
        THEME_CATALOG.forEach((t) => {
          const val = ucfg.themes?.[t.id];
          (themesOverride as any)[t.id] = val !== false;
        });

        return NextResponse.json({
          ...flags,
          toolEnabled: flags.toolEnabled && toolEnabledOverride,
          features: featuresOverride,
          patterns: patternsOverride,
          themes: themesOverride,
        });
      }
    }
  } catch (err) {
    console.error("Failed to check user settings overrides in GET /api/feature-flags:", err);
  }

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
