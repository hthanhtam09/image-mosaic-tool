"use client";

import { useEffect, useState } from "react";
import { userPlan } from "@/lib/auth/user";
import { buildToolAccess, type ToolAccess } from "@/lib/tools/access";
import { createClient } from "@/utils/supabase/client";

// Module-level cache so re-mounting the component doesn't flash a loader
let cachedAccess: ToolAccess | null = null;

export function useToolAccess(): ToolAccess {
  const [access, setAccess] = useState<ToolAccess>(() =>
    cachedAccess ?? buildToolAccess(null, true),
  );

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    const applyUser = (
      authUser: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"],
    ) => {
      if (!alive) return;
      const next = authUser
        ? buildToolAccess(userPlan(authUser.user_metadata ?? {}, authUser.app_metadata ?? {}))
        : buildToolAccess(null);
      cachedAccess = next;
      setAccess(next);
    };

    supabase.auth
      .getUser()
      .then(({ data }) => applyUser(data.user))
      .catch(() => {
        if (alive) {
          const fallback = buildToolAccess(null);
          cachedAccess = fallback;
          setAccess(fallback);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return access;
}
