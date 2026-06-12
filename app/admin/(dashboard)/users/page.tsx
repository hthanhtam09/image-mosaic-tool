"use client";

import { useState, useEffect, Fragment } from "react";
import { match, tableCardClass, thClass, userStatusClasses, type AdminUser, type UserStatus } from "@/components/admin/data";
import { Avatar, PageHeader, SearchInput, StatCard, Toggle } from "@/components/admin/ui";
import { useFeatureFlags } from "@/components/admin/useFeatureFlags";
import { toast } from "@/store/useToastStore";
import { FEATURE_META, PATTERN_CATALOG, THEME_CATALOG } from "@/lib/featureFlags";

type OverrideValue = "enabled" | "disabled";

// Client-side cache to keep user data between page mounts/transitions
let cachedUsers: AdminUser[] | null = null;

export default function UsersPage() {
  const { flags } = useFeatureFlags();
  const toolGlobal = flags.toolEnabled;

  const [users, setUsers] = useState<AdminUser[]>(() => cachedUsers || []);
  const [loading, setLoading] = useState(() => !cachedUsers);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Track expanded user ID
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load users");
        return r.json();
      })
      .then((data) => {
        if (!alive) return;
        
        const hasChanged = JSON.stringify(data) !== JSON.stringify(cachedUsers);
        if (hasChanged) {
          cachedUsers = data;
          setUsers(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const toggleTool = async (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;

    const nextToolVal = !u.tool;
    const nextToolConfig = (nextToolVal ? "enabled" : "disabled") as OverrideValue;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          toolEnabled: nextToolConfig,
          status: u.status,
          features: u.config?.features || {},
          patterns: u.config?.patterns || {},
          themes: u.config?.themes || {},
        }),
      });

      if (!res.ok) throw new Error("Failed to update tool access");

      setUsers((prev) => {
        const next = prev.map((x) =>
          x.id === id
            ? {
                ...x,
                tool: nextToolVal,
                config: {
                  ...x.config,
                  toolEnabled: nextToolConfig,
                  features: x.config?.features || {},
                  patterns: x.config?.patterns || {},
                  themes: x.config?.themes || {},
                },
              }
            : x
        );
        cachedUsers = next;
        return next;
      });
      toast.success(`Tool access updated for ${u.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update tool access");
    }
  };

  const toggleSuspend = async (id: string) => {
    const u = users.find((x) => x.id === id);
    if (!u) return;

    const nextStatus = (u.status === "Suspended" ? "Active" : "Suspended") as UserStatus;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: id,
          toolEnabled: (u.config?.toolEnabled === "disabled" ? "disabled" : "enabled") as OverrideValue,
          status: nextStatus,
          features: u.config?.features || {},
          patterns: u.config?.patterns || {},
          themes: u.config?.themes || {},
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      setUsers((prev) => {
        const next = prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: nextStatus,
              }
            : x
        );
        cachedUsers = next;
        return next;
      });
      toast.success(`Status updated for ${u.name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleOverrideChange = async (
    userId: string,
    section: "features" | "patterns" | "themes",
    key: string,
    val: OverrideValue
  ) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;

    const featuresOverride = { ...((u.config && u.config.features) || {}) };
    const patternsOverride = { ...((u.config && u.config.patterns) || {}) };
    const themesOverride = { ...((u.config && u.config.themes) || {}) };

    if (section === "features") {
      featuresOverride[key] = val === "enabled";
    } else if (section === "patterns") {
      patternsOverride[key] = val === "enabled";
    } else if (section === "themes") {
      themesOverride[key] = val === "enabled";
    }

    const toolEnabled = (u.config?.toolEnabled === "disabled" ? "disabled" : "enabled") as OverrideValue;

    setUsers((prev) => {
      const next = prev.map((x) =>
        x.id === userId
          ? {
              ...x,
              config: {
                toolEnabled,
                features: featuresOverride,
                patterns: patternsOverride,
                themes: themesOverride,
              },
            }
          : x
      );
      cachedUsers = next;
      return next;
    });

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          toolEnabled,
          status: u.status,
          features: featuresOverride,
          patterns: patternsOverride,
          themes: themesOverride,
        }),
      });

      if (!res.ok) throw new Error("Failed to save configuration");
      toast.success("Settings override updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-[var(--text-secondary)]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center text-red-400">
        <div className="text-center">
          <p className="font-semibold">Error Loading Users</p>
          <p className="text-sm text-text-secondary mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const filtered = users.filter((u) => match(query, u.name, u.email, u.plan, u.status));
  const total = users.length;
  const active = users.filter((u) => u.status === "Active").length;
  const suspended = users.filter((u) => u.status === "Suspended").length;
  const toolOn = users.filter((u) => u.tool).length;

  return (
    <>
      <PageHeader title="Users">
        <SearchInput value={query} onChange={setQuery} placeholder="Search users..." />
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={String(total)} />
        <StatCard label="Active" value={String(active)} />
        <StatCard label="Suspended" value={String(suspended)} />
        <StatCard label="Tool access on" value={`${toolOn} / ${total}`} hint={toolGlobal ? undefined : "Tool hidden globally"} />
      </section>

      {!toolGlobal && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-amber-200/90">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
          <span>The Mosaic Tool is hidden for everyone. Per-user access is disabled until you re-enable it in Settings → Tool access.</span>
        </div>
      )}

      <section className={`${tableCardClass} mt-5`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="text-text-secondary">
              <tr className="border-b border-border-primary">
                <th className={thClass}>User</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Joined</th>
                <th className={thClass}>Exports</th>
                <th className={thClass}>Tool access</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {filtered.map((u) => {
                const isExpanded = expandedUserId === u.id;
                return (
                  <Fragment key={u.id}>
                    {/* Main Row */}
                    <tr className={`${isExpanded ? "bg-bg-primary/20" : ""} hover:bg-white/5 transition`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div>
                            <p>{u.name}</p>
                            <p className="text-xs text-text-secondary">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">{u.plan}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${userStatusClasses[u.status]}`}>{u.status}</span>
                      </td>
                      <td className="px-5 py-4 text-text-secondary">{u.joined}</td>
                      <td className="px-5 py-4 font-mono text-text-secondary">{u.exports}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <Toggle on={u.tool && toolGlobal} disabled={!toolGlobal} label={`Tool access for ${u.name}`} onChange={() => toggleTool(u.id)} />
                          <span className="text-xs text-text-secondary">{u.tool && toolGlobal ? "Visible" : "Hidden"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className={`mr-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition inline-flex items-center gap-1.5 ${
                            isExpanded
                              ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold"
                              : "border-border-primary text-text-primary hover:bg-white/5"
                          }`}
                        >
                          Settings
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSuspend(u.id)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            u.status === "Suspended"
                              ? "border-border-primary text-text-primary hover:bg-white/5"
                              : "border-red-400/30 text-red-300 hover:bg-red-400/10"
                          }`}
                        >
                          {u.status === "Suspended" ? "Activate" : "Suspend"}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Settings Row */}
                    {isExpanded && (
                      <tr className="bg-bg-primary/10 border-t border-b border-border-primary/50">
                        <td colSpan={7} className="px-6 py-5">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-border-primary/30 pb-3">
                              <h4 className="text-sm font-semibold text-text-primary">
                                Configuration Overrides — {u.name}
                              </h4>
                              <span className="text-xs text-text-secondary font-medium">
                                Changes are saved immediately to the database
                              </span>
                            </div>

                            <div className="grid gap-6 md:grid-cols-3">
                              {/* 1. Tool Features */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                  Tool Features
                                </h5>
                                <div className="divide-y divide-border-primary rounded-xl border border-border-primary bg-bg-secondary overflow-hidden">
                                  {FEATURE_META.map((f) => {
                                    const val = u.config?.features[f.key] === false ? "disabled" : "enabled";
                                    return (
                                      <div key={f.key} className="flex items-center justify-between p-3.5">
                                        <div className="max-w-[65%]">
                                          <p className="text-xs font-semibold text-text-primary">{f.name}</p>
                                          <p className="text-[10px] text-text-secondary mt-0.5">{f.description}</p>
                                        </div>
                                        <select
                                          value={val}
                                          onChange={(e) => handleOverrideChange(u.id, "features", f.key, e.target.value as OverrideValue)}
                                          className="h-8 rounded-lg border border-border-primary bg-bg-primary px-2 text-[10px] text-text-primary outline-none focus:border-accent"
                                        >
                                          <option value="enabled">Enable</option>
                                          <option value="disabled">Disable</option>
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Mosaic Patterns */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                  Mosaic Patterns
                                </h5>
                                <div className="divide-y divide-border-primary rounded-xl border border-border-primary bg-bg-secondary overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
                                  {PATTERN_CATALOG.map((p) => {
                                    const val = u.config?.patterns[p.id] === false ? "disabled" : "enabled";
                                    return (
                                      <div key={p.id} className="flex items-center justify-between p-3.5">
                                        <span className="text-xs font-semibold text-text-primary">{p.label}</span>
                                        <select
                                          value={val}
                                          onChange={(e) => handleOverrideChange(u.id, "patterns", p.id, e.target.value as OverrideValue)}
                                          className="h-8 rounded-lg border border-border-primary bg-bg-primary px-2 text-[10px] text-text-primary outline-none focus:border-accent"
                                        >
                                          <option value="enabled">Show</option>
                                          <option value="disabled">Hide</option>
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 3. Color Themes */}
                              <div className="space-y-3">
                                <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                  Color Themes
                                </h5>
                                <div className="divide-y divide-border-primary rounded-xl border border-border-primary bg-bg-secondary overflow-hidden max-h-72 overflow-y-auto custom-scrollbar">
                                  {THEME_CATALOG.map((t) => {
                                    const val = u.config?.themes[t.id] === false ? "disabled" : "enabled";
                                    return (
                                      <div key={t.id} className="flex items-center justify-between p-3.5">
                                        <div className="flex items-center gap-2">
                                          <span className="h-3.5 w-3.5 rounded-full border border-white/20" style={{ backgroundColor: t.color }} />
                                          <span className="text-xs font-semibold text-text-primary">{t.label}</span>
                                        </div>
                                        <select
                                          value={val}
                                          onChange={(e) => handleOverrideChange(u.id, "themes", t.id, e.target.value as OverrideValue)}
                                          className="h-8 rounded-lg border border-border-primary bg-bg-primary px-2 text-[10px] text-text-primary outline-none focus:border-accent"
                                        >
                                          <option value="enabled">Show</option>
                                          <option value="disabled">Hide</option>
                                        </select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-text-secondary">No users match “{query}”.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
