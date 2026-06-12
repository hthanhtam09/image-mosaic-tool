"use client";

import { useState } from "react";
import { match, payments, tableCardClass, type PaymentStatus } from "@/components/admin/data";
import { PageHeader, PaymentsTable, SearchInput, StatCard } from "@/components/admin/ui";

const FILTERS = ["All", "Paid", "Refunded", "Failed"] as const;

export default function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const rows = payments.filter(
    ([name, email, plan, , status]) => (filter === "All" || status === filter) && match(query, name, email, plan, status),
  );
  const num = (s: string) => Number(s.replace(/[^0-9.]/g, ""));
  const collected = payments.filter((p) => p[4] === ("Paid" as PaymentStatus)).reduce((s, p) => s + num(p[3]), 0);
  const refunded = payments.filter((p) => p[4] === ("Refunded" as PaymentStatus)).reduce((s, p) => s + num(p[3]), 0);
  const failed = payments.filter((p) => p[4] === ("Failed" as PaymentStatus)).length;

  return (
    <>
      <PageHeader title="Payments">
        <SearchInput value={query} onChange={setQuery} placeholder="Search payments..." />
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={`$${collected.toFixed(2)}`} hint="This period · paid" />
        <StatCard label="Refunded" value={`$${refunded.toFixed(2)}`} />
        <StatCard label="Failed charges" value={String(failed)} />
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "border-transparent bg-accent/10 text-accent"
                : "border-border-primary text-text-secondary hover:text-text-primary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <section className={`${tableCardClass} mt-5`}>
        <div className="overflow-x-auto">
          {rows.length > 0 ? (
            <PaymentsTable rows={rows} />
          ) : (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">No payments match this view.</p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border-primary px-5 py-4 text-sm text-text-secondary">
          <span>Showing {rows.length} of 248</span>
          <div className="flex gap-2">
            {["M15 18l-6-6 6-6", "M9 18l6-6-6-6"].map((path) => (
              <button key={path} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-primary transition hover:bg-white/5 hover:text-white" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={path} />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
