// Shared mock data, types and class-name constants for the admin dashboard.

export type Plan = "Free" | "Pro" | "Studio";
export type UserStatus = "Active" | "Trialing" | "Suspended";
export type PaymentStatus = "Paid" | "Refunded" | "Failed";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: Plan;
  status: UserStatus;
  joined: string;
  exports: string;
  tool: boolean;
}

export type PaymentRow = [string, string, Plan, string, PaymentStatus, string];

export const PLAN_PRICE: Record<Plan, number> = { Free: 0, Pro: 19, Studio: 49 };

export const initialUsers: AdminUser[] = [
  { id: "u1", name: "Jordan Reyes", email: "jordan@reyesbooks.com", plan: "Pro", status: "Active", joined: "Aug 2025", exports: "32 / 50", tool: true },
  { id: "u2", name: "Mara Lin", email: "mara@studiolin.co", plan: "Studio", status: "Active", joined: "Jun 2025", exports: "120 / ∞", tool: true },
  { id: "u3", name: "Devon Park", email: "devon@kdpfast.com", plan: "Pro", status: "Suspended", joined: "Sep 2025", exports: "8 / 50", tool: false },
  { id: "u4", name: "Aisha Noor", email: "aisha@coloringco.io", plan: "Studio", status: "Active", joined: "May 2025", exports: "210 / ∞", tool: true },
  { id: "u5", name: "Tom Wexler", email: "tom@wexlerpress.com", plan: "Free", status: "Trialing", joined: "Feb 2026", exports: "3 / 5", tool: true },
  { id: "u6", name: "Lena Ortiz", email: "lena@brightpages.net", plan: "Pro", status: "Active", joined: "Nov 2025", exports: "44 / 50", tool: true },
  { id: "u7", name: "Priya Shah", email: "priya@inkwell.studio", plan: "Free", status: "Active", joined: "Jan 2026", exports: "1 / 5", tool: true },
  { id: "u8", name: "Cole Mercer", email: "cole@mercerprints.com", plan: "Studio", status: "Suspended", joined: "Jul 2025", exports: "0 / ∞", tool: false },
];

export const payments: PaymentRow[] = [
  ["Jordan Reyes", "jordan@reyesbooks.com", "Pro", "$19.00", "Paid", "Feb 14"],
  ["Mara Lin", "mara@studiolin.co", "Studio", "$49.00", "Paid", "Feb 14"],
  ["Devon Park", "devon@kdpfast.com", "Pro", "$19.00", "Refunded", "Feb 13"],
  ["Aisha Noor", "aisha@coloringco.io", "Studio", "$49.00", "Paid", "Feb 13"],
  ["Tom Wexler", "tom@wexlerpress.com", "Pro", "$19.00", "Failed", "Feb 12"],
  ["Lena Ortiz", "lena@brightpages.net", "Pro", "$15.00", "Paid", "Feb 12"],
];

export const kpis = [
  { label: "Total users", value: "8,420", change: "+12.4%", direction: "up", points: [7, 10, 8, 13, 12, 15, 14, 18] },
  { label: "Active subscriptions", value: "2,184", change: "+8.1%", direction: "up", points: [8, 11, 9, 14, 13, 17, 16, 19] },
  { label: "MRR", value: "$41.5k", change: "+5.6%", direction: "up", points: [9, 10, 13, 12, 15, 17, 16, 20] },
  { label: "Total revenue", value: "$312k", change: "-1.2%", direction: "down", points: [18, 16, 17, 14, 13, 12, 10, 11] },
] as const;

export const paymentStatusClasses: Record<PaymentStatus, string> = {
  Paid: "bg-emerald-400/10 text-emerald-300",
  Refunded: "bg-amber-400/10 text-amber-300",
  Failed: "bg-red-400/10 text-red-300",
};

export const userStatusClasses: Record<UserStatus, string> = {
  Active: "bg-emerald-400/10 text-emerald-300",
  Trialing: "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  Suspended: "bg-white/5 text-[var(--text-muted)]",
};

export const cardClass = "rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-xl shadow-black/10";
export const tableCardClass = "overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-xl shadow-black/10";
export const thClass = "px-5 py-3 text-left font-medium";

export const initialsOf = (name: string) => name.split(" ").map((w) => w[0]).join("");
export const match = (query: string, ...fields: string[]) =>
  !query.trim() || fields.some((f) => f.toLowerCase().includes(query.trim().toLowerCase()));

export type NavKey = "overview" | "users" | "payments" | "revenue" | "subscriptions" | "settings";

export const NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "users", label: "Users", href: "/admin/users" },
  { key: "payments", label: "Payments", href: "/admin/payments" },
  { key: "revenue", label: "Revenue", href: "/admin/revenue" },
  { key: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions" },
  { key: "settings", label: "Settings", href: "/admin/settings" },
];
