import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    if (!process.env.DIRECT_URL) {
      throw new Error("Missing DIRECT_URL environment variable.");
    }
    pool = new Pool({
      connectionString: process.env.DIRECT_URL,
    });
  }
  return pool;
}

export async function ensureUserConfigTable() {
  const p = getDbPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.user_config (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      tool_enabled BOOLEAN NOT NULL DEFAULT true,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      features JSONB NOT NULL DEFAULT '{}'::jsonb,
      patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
      themes JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
