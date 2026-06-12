// Server-only store for feature flags, backed by Supabase via @supabase/ssr.
// Imported exclusively from route handlers (Node runtime).
//
// Storage model: a single row in the `app_config` table, keyed by id, whose
// `data` (jsonb) column holds the whole FeatureFlags object.
//
// Requires the table + RLS policies from supabase/feature_flags.sql, plus:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_FLAGS, normalizeFlags, type FeatureFlags } from "./featureFlags";

const TABLE = "app_config";
const ROW_ID = "feature_flags";

async function db() {
  return createClient(await cookies());
}

export async function getFlags(): Promise<FeatureFlags> {
  try {
    const supabase = await db();
    const { data, error } = await supabase.from(TABLE).select("data").eq("id", ROW_ID).maybeSingle();
    if (error) {
      console.error("[featureFlags] read failed:", error.message);
      return DEFAULT_FLAGS;
    }
    return normalizeFlags((data?.data as Partial<FeatureFlags>) ?? null);
  } catch (err) {
    console.error("[featureFlags] read error:", err instanceof Error ? err.message : err);
    return DEFAULT_FLAGS;
  }
}

export async function saveFlags(patch: Partial<FeatureFlags>): Promise<FeatureFlags> {
  const supabase = await db();
  const current = await getFlags();
  const next = normalizeFlags({
    ...current,
    ...patch,
    features: { ...current.features, ...(patch.features ?? {}) },
    patterns: { ...current.patterns, ...(patch.patterns ?? {}) },
    themes: { ...current.themes, ...(patch.themes ?? {}) },
  });

  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: next, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(`Failed to save flags: ${error.message}`);

  return next;
}
