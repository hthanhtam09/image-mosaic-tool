"use client";

import { cardClass } from "@/components/admin/data";
import { AreaChart, BarChart, DateRange, DonutChart, PageHeader, StatCard } from "@/components/admin/ui";

export default function RevenuePage() {
  return (
    <>
      <PageHeader title="Revenue">
        <DateRange />
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="MRR" value="$41.5k" hint="+5.6% vs last month" />
        <StatCard label="Total revenue" value="$312k" />
        <StatCard label="ARPU" value="$19.0" hint="Per paying user" />
      </section>

      <section className={`${cardClass} mt-5`}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-semibold">Revenue over time</h2>
          <div className="rounded-lg border border-border-primary bg-bg-primary p-1">
            <button className="rounded-md bg-bg-tertiary px-3 py-1.5 text-xs" type="button">Monthly</button>
            <button className="rounded-md px-3 py-1.5 text-xs text-text-secondary" type="button">Weekly</button>
          </div>
        </div>
        <AreaChart />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className={cardClass}>
          <h2 className="mb-5 font-semibold">New signups per month</h2>
          <BarChart />
        </div>
        <div className={cardClass}>
          <h2 className="mb-5 font-semibold">Revenue by plan</h2>
          <DonutChart />
        </div>
      </section>
    </>
  );
}
