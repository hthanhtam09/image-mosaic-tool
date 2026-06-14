"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { initialsOf, userDisplayName, userPlan } from "@/lib/auth/user";
import { logoutSession } from "@/lib/auth/logout";
import { PLAN, PLAN_UPGRADE_CTA } from "@/lib/plans";
import { createClient } from "@/utils/supabase/client";

type ToolUser = {
  name: string;
  plan: string;
};

export default function ToolUserHeader() {
  const pathname = usePathname();
  const [redirectTo, setRedirectTo] = useState("/studio/projects");
  useEffect(() => {
    const handle = requestAnimationFrame(() => {
      setRedirectTo(window.location.pathname + window.location.search);
    });
    return () => cancelAnimationFrame(handle);
  }, [pathname]);

  const [user, setUser] = useState<ToolUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    let alive = true;
    const supabase = createClient();
    const applyAuthUser = (authUser: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]) => {
      if (!alive) return;
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const metadata = authUser.user_metadata ?? {};
      const appMetadata = authUser.app_metadata ?? {};
      setUser({
        name: userDisplayName(metadata, authUser.email),
        plan: userPlan(metadata, appMetadata),
      });
      setLoading(false);
    };

    supabase.auth
      .getUser()
      .then(({ data }) => {
        applyAuthUser(data.user);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthUser(session?.user ?? null);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDocumentPointerDown);
    return () =>
      document.removeEventListener("pointerdown", onDocumentPointerDown);
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => {});
    await logoutSession();
    window.location.assign("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <span className="h-10 w-10 rounded-full bg-white/8" />
        <span className="hidden h-8 w-28 rounded bg-white/6 sm:block" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
          aria-label="Open guest menu"
          aria-expanded={open}
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-sm font-semibold text-(--text-secondary)">
            G
          </span>
          <span className="hidden min-w-0 flex-col items-start sm:flex">
            <span className="text-sm font-semibold leading-4 text-(--text-primary)">
              Guest
            </span>
            <span className="mt-1 inline-flex shrink-0 rounded-full border border-white/20 bg-white/6 px-2 py-0.5 text-[11px] font-semibold leading-none text-(--text-secondary)">
              Guest
            </span>
          </span>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-(--border-primary) bg-(--bg-secondary) p-2 shadow-2xl shadow-black/30"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-(--text-primary)">Guest</p>
              <p className="mt-0.5 text-xs text-(--text-secondary)">
                Sign in to save your work
              </p>
            </div>
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="mb-1 block rounded-lg bg-(--accent) px-3 py-2 text-center text-sm font-semibold text-(--bg-primary) transition hover:bg-(--accent-hover)"
            >
              Sign in
            </Link>
            <Link
              href="/pricing"
              className="block rounded-lg px-3 py-2 text-sm text-(--text-primary) transition hover:bg-white/5"
            >
              View plans
            </Link>
          </div>
        )}
      </div>
    );
  }

  const isFreePlan = user.plan === PLAN.FREE;
  const initials = initialsOf(user.name);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
        aria-label="Open user menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--accent) text-sm font-semibold text-(--bg-primary)">
          {initials}
        </span>
        <span className="hidden min-w-0 flex-col items-start sm:flex">
          <span className="max-w-40 truncate text-sm font-semibold leading-4 text-(--text-primary)">
            {user.name}
          </span>
          <span className="mt-1 inline-flex shrink-0 rounded-full border border-(--accent)/30 bg-(--accent)/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-(--accent)">
            {user.plan}
          </span>
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-(--border-primary) bg-(--bg-secondary) p-2 shadow-2xl shadow-black/30"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-(--text-primary)">
              {user.name}
            </p>
            <p className="mt-0.5 text-xs text-(--text-secondary)">
              Current plan: {user.plan}
            </p>
          </div>

          {isFreePlan && (
            <Link
              href="/pricing"
              className="mb-1 block rounded-lg bg-(--accent) px-3 py-2 text-center text-sm font-semibold text-(--bg-primary) transition hover:bg-(--accent-hover)"
            >
              {PLAN_UPGRADE_CTA[PLAN.PLUS]}
            </Link>
          )}

          <Link
            href="/account"
            className="block rounded-lg px-3 py-2 text-sm text-(--text-primary) transition hover:bg-white/5"
          >
            Account
          </Link>
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-(--text-muted)"
          >
            <span>Theme</span>
            <span className="text-[10px] uppercase tracking-[0.14em]">
              Soon
            </span>
          </button>
          <div className="my-1 h-px bg-(--border-primary)" />
          <button
            type="button"
            onClick={() => void logout()}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-(--text-secondary) transition hover:bg-white/5 hover:text-(--text-primary)"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
