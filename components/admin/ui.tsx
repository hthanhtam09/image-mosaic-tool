import type { ReactNode } from "react";
import {
  LayoutGrid,
  Users,
  CreditCard,
  TrendingUp,
  Repeat2,
  Settings,
  Search,
  Minus,
  Plus,
} from "lucide-react";
import { cardClass, initialsOf, paymentStatusClasses, thClass, type NavKey, type PaymentRow } from "./data";

export function NavIcon({ name, className = "h-4 w-4" }: { name: NavKey; className?: string }) {
  switch (name) {
    case "overview":      return <LayoutGrid className={className} />;
    case "users":         return <Users className={className} />;
    case "payments":      return <CreditCard className={className} />;
    case "revenue":       return <TrendingUp className={className} />;
    case "subscriptions": return <Repeat2 className={className} />;
    case "settings":      return <Settings className={className} />;
  }
}

export function Toggle({ on, disabled, label, onChange }: { on: boolean; disabled?: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        on ? "border-accent bg-accent/30" : "border-border-primary bg-bg-tertiary"
      }`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${on ? "left-[22px] bg-accent" : "left-0.5 bg-text-secondary"}`} />
    </button>
  );
}

export function Stepper({ value, max, disabled, onChange }: { value: number; max: number; disabled?: boolean; onChange: (v: number) => void }) {
  const btn = "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-primary text-text-secondary transition hover:bg-white/5 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} disabled={disabled || value <= 0} aria-label="Decrease" onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-12 text-center font-mono text-sm tabular-nums">
        {value}
        <span className="text-text-muted">/{max}</span>
      </span>
      <button type="button" className={btn} disabled={disabled || value >= max} aria-label="Increase" onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Avatar({ name, className = "h-8 w-8 text-xs" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-bg-primary ${className}`}>
      {initialsOf(name)}
    </span>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">{label}</p>
      <p className="mt-3 font-mono text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm text-text-secondary">Workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-col gap-3 sm:flex-row sm:items-center">{children}</div>}
    </div>
  );
}

export function DateRange() {
  return (
    <select className="h-10 rounded-lg border border-border-primary bg-bg-secondary px-3 text-sm outline-none focus:border-accent">
      <option>Last 30 days</option>
      <option>Last 7 days</option>
      <option>This year</option>
    </select>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block">
      <span className="sr-only">Search admin records</span>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border-primary bg-bg-secondary pl-10 pr-3 text-sm outline-none placeholder:text-text-muted focus:border-accent sm:w-64"
        placeholder={placeholder}
      />
    </label>
  );
}

export function Sparkline({ points, direction }: { points: readonly number[]; direction: "up" | "down" }) {
  const width = 70;
  const height = 24;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - point;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke={direction === "down" ? "#F87171" : "var(--accent-primary)"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AreaChart() {
  const width = 760;
  const height = 260;
  const padding = 30;
  const data = [18, 22, 20, 28, 26, 34, 32, 40, 38, 46, 44, 52];
  const max = 60;
  const x = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
  const y = (value: number) => height - padding - (value / max) * (height - padding * 2);
  const line = data.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");
  const area = `${line} L ${x(data.length - 1)} ${height - padding} L ${x(0)} ${height - padding} Z`;
  return (
    <svg className="h-64 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Revenue over time chart">
      <defs>
        <linearGradient id="admin-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((tick) => {
        const gy = padding + (tick / 4) * (height - padding * 2);
        return <line key={tick} x1={padding} y1={gy} x2={width - padding} y2={gy} stroke="rgba(148,163,184,.12)" />;
      })}
      <path d={area} fill="url(#admin-area)" />
      <path d={line} fill="none" stroke="var(--accent-primary)" strokeWidth="2.5" />
      {data.map((value, index) => (
        <circle key={index} cx={x(index)} cy={y(value)} r="3" fill="var(--bg-primary)" stroke="var(--accent-primary)" strokeWidth="2" />
      ))}
    </svg>
  );
}

export function BarChart() {
  const width = 360;
  const height = 220;
  const padding = 24;
  const data = [120, 180, 150, 210, 190, 240, 220, 280];
  const max = 300;
  const gap = (width - padding * 2) / data.length;
  const barWidth = gap * 0.55;
  return (
    <svg className="h-56 w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="New signups per month chart">
      {[0, 1, 2, 3].map((tick) => {
        const gy = padding + (tick / 3) * (height - padding * 2);
        return <line key={tick} x1={padding} y1={gy} x2={width - padding} y2={gy} stroke="rgba(148,163,184,.12)" />;
      })}
      {data.map((value, index) => {
        const barHeight = (value / max) * (height - padding * 2);
        const barX = padding + index * gap + (gap - barWidth) / 2;
        const barY = height - padding - barHeight;
        return <rect key={index} x={barX} y={barY} width={barWidth} height={barHeight} rx="3" fill="var(--accent-primary)" opacity={0.45 + (value / max) * 0.5} />;
      })}
    </svg>
  );
}

export function DonutChart() {
  const segments = [
    { label: "Plus", amount: "$24.1k", value: 24.1, color: "var(--accent-primary)" },
    { label: "Pro", amount: "$13.8k", value: 13.8, color: "#2A636B" },
    { label: "Free", amount: "$3.6k", value: 3.6, color: "#64748B" },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label="Revenue by plan chart">
        {segments.map((segment) => {
          const length = (segment.value / total) * circumference;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle key={segment.label} cx="80" cy="80" r={radius} fill="none" stroke={segment.color} strokeWidth="20" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={dashOffset} transform="rotate(-90 80 80)" />
          );
        })}
        <text x="80" y="78" textAnchor="middle" fill="white" fontSize="20" fontWeight="600" fontFamily="monospace">$41.5k</text>
        <text x="80" y="96" textAnchor="middle" fill="#94A3B8" fontSize="10">MRR</text>
      </svg>
      <div className="w-full max-w-xs space-y-3 text-sm">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: segment.color }} />
            <span>{segment.label}</span>
            <span className="ml-auto font-mono text-text-secondary">{segment.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaymentsTable({ rows }: { rows: PaymentRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-text-secondary">
        <tr className="border-b border-border-primary">
          <th className={thClass}>User</th>
          <th className={thClass}>Plan</th>
          <th className={thClass}>Amount</th>
          <th className={thClass}>Status</th>
          <th className={thClass}>Date</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-primary">
        {rows.map(([name, email, plan, amount, status, date]) => (
          <tr key={email + date}>
            <td className="px-5 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} />
                <div>
                  <p>{name}</p>
                  <p className="text-xs text-text-secondary">{email}</p>
                </div>
              </div>
            </td>
            <td className="px-5 py-4">
              <span className="rounded-full bg-bg-tertiary px-2.5 py-1 text-xs text-text-secondary">{plan}</span>
            </td>
            <td className="px-5 py-4 font-mono">{amount}</td>
            <td className="px-5 py-4">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentStatusClasses[status]}`}>{status}</span>
            </td>
            <td className="px-5 py-4 text-text-secondary">{date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
