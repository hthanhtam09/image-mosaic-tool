"use client";

import { useState } from "react";
import { initialUsers, match, PLAN_PRICE, tableCardClass, thClass } from "@/components/admin/data";
import { Avatar, PageHeader, SearchInput, StatCard } from "@/components/admin/ui";

export default function SubscriptionsPage() {
  const [query, setQuery] = useState("");

  const subs = initialUsers
    .filter((u) => u.plan !== "Free")
    .filter((u) => match(query, u.name, u.email, u.plan))
    .map((u) => ({
      ...u,
      subStatus: u.status === "Suspended" ? "Paused" : "Active",
      mrr: PLAN_PRICE[u.plan],
    }));
  const activeCount = subs.filter((s) => s.subStatus === "Active").length;
  const mrr = subs.filter((s) => s.subStatus === "Active").reduce((sum, s) => sum + s.mrr, 0);

  return (
    <>
      <PageHeader title="Subscriptions">
        <SearchInput value={query} onChange={setQuery} placeholder="Search subscribers..." />
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active subscriptions" value={String(activeCount)} />
        <StatCard label="MRR (sample)" value={`$${mrr}`} />
        <StatCard label="Churn (30d)" value="1.8%" hint="−0.3% vs last month" />
      </section>

      <section className={`${tableCardClass} mt-5`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-text-secondary">
              <tr className="border-b border-border-primary">
                <th className={thClass}>Subscriber</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Started</th>
                <th className={`${thClass} text-right`}>MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} />
                      <div>
                        <p>{s.name}</p>
                        <p className="text-xs text-text-secondary">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">{s.plan}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.subStatus === "Active" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                      {s.subStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-secondary">{s.joined}</td>
                  <td className="px-5 py-4 text-right font-mono">${s.mrr}.00</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
