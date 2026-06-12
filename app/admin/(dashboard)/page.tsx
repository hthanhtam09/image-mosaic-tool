"use client";

import { cardClass, kpis, payments, tableCardClass } from "@/components/admin/data";
import { AreaChart, BarChart, DateRange, DonutChart, PageHeader, PaymentsTable, Sparkline } from "@/components/admin/ui";

export default function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview">
        <DateRange />
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={cardClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">{kpi.label}</p>
            <p className="mt-3 font-mono text-3xl font-semibold">{kpi.value}</p>
            <div className="mt-4 flex items-center justify-between">
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-xs ${
                  kpi.direction === "down" ? "bg-red-400/10 text-red-300" : "bg-accent/10 text-accent"
                }`}
              >
                {kpi.change}
              </span>
              <Sparkline points={kpi.points} direction={kpi.direction} />
            </div>
          </div>
        ))}
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

      <section className={`${tableCardClass} mt-5`}>
        <div className="px-5 pt-5">
          <h2 className="font-semibold">Recent payments</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <PaymentsTable rows={payments} />
        </div>
      </section>
    </>
  );
}
