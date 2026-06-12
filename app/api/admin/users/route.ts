import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDbPool, ensureUserConfigTable } from "@/lib/db";
import { SESSION_COOKIE, isValidSession } from "@/lib/admin/auth";
import { userDisplayName, userPlan } from "@/lib/auth/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserConfigTable();
    const pool = getDbPool();
    const { rows } = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.raw_user_meta_data, 
        u.created_at,
        c.tool_enabled,
        c.status,
        c.features,
        c.patterns,
        c.themes
      FROM auth.users u
      LEFT JOIN public.user_config c ON u.id = c.user_id
      ORDER BY u.created_at DESC;
    `);

    const formattedUsers = rows.map((r: any) => {
      const meta = r.raw_user_meta_data || {};
      const name = userDisplayName(meta, r.email);
      const plan = userPlan(meta);
      
      const joinedDate = new Date(r.created_at);
      const joined = joinedDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });

      return {
        id: r.id,
        name,
        email: r.email || "",
        plan,
        status: r.status || "Active",
        joined,
        exports: "0 / 5", // Default placeholder
        tool: r.tool_enabled !== false,
        config: {
          toolEnabled: r.tool_enabled === null ? "inherit" : (r.tool_enabled ? "enabled" : "disabled"),
          features: r.features || {},
          patterns: r.patterns || {},
          themes: r.themes || {},
        },
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (err) {
    console.error("GET /api/admin/users failed:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const jar = await cookies();
  if (!isValidSession(jar.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, toolEnabled, status, features, patterns, themes } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    let dbToolEnabled = null;
    if (toolEnabled === true || toolEnabled === "enabled") dbToolEnabled = true;
    if (toolEnabled === false || toolEnabled === "disabled") dbToolEnabled = false;

    await ensureUserConfigTable();
    const pool = getDbPool();
    await pool.query(
      `
      INSERT INTO public.user_config (user_id, tool_enabled, status, features, patterns, themes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        tool_enabled = EXCLUDED.tool_enabled,
        status = EXCLUDED.status,
        features = EXCLUDED.features,
        patterns = EXCLUDED.patterns,
        themes = EXCLUDED.themes,
        updated_at = NOW();
      `,
      [
        userId,
        dbToolEnabled,
        status || "Active",
        JSON.stringify(features || {}),
        JSON.stringify(patterns || {}),
        JSON.stringify(themes || {}),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin/users failed:", err);
    return NextResponse.json({ error: "Failed to update user config" }, { status: 500 });
  }
}
