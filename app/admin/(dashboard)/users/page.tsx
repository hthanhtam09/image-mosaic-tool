"use client";

import { useState } from "react";
import { initialUsers, match, tableCardClass, thClass, userStatusClasses, type AdminUser } from "@/components/admin/data";
import { Avatar, PageHeader, SearchInput, StatCard, Toggle } from "@/components/admin/ui";
import { useFeatureFlags } from "@/components/admin/useFeatureFlags";

export default function UsersPage() {
  const { flags } = useFeatureFlags();
  const toolGlobal = flags.toolEnabled;

  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [query, setQuery] = useState("");

  const toggleTool = (id: string) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, tool: !u.tool } : u)));
  const toggleSuspend = (id: string) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: u.status === "Suspended" ? "Active" : "Suspended" } : u)));

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
          <table className="w-full text-sm">
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
              {filtered.map((u) => (
                <tr key={u.id}>
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
              ))}
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
