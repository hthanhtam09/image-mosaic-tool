import type { PlanName } from "@/lib/auth/user";

export interface Plan {
  name: PlanName;
  desc: string;
  m: number;
  y: number;
  pop?: boolean;
  features: string[];
  cta: string;
}

export const PLANS: Plan[] = [
  { name: "Free", desc: "For trying things out", m: 0, y: 0, cta: "Start free", features: ["5 exports / month", "3 mosaic styles", "Watermark on exports"] },
  {
    name: "Plus",
    desc: "For active creators",
    m: 19,
    y: 15,
    pop: true,
    cta: "Get Plus",
    features: ["Unlimited exports", "All 10 styles · no watermark", "PDF book export", "Before/After · Object Focus"],
  },
  {
    name: "Pro",
    desc: "For teams & volume",
    m: 49,
    y: 39,
    cta: "Get Pro",
    features: ["Everything in Plus", "Bulk folder upload", "Priority rendering", "Commercial license"],
  },
];

export const CMP: [string, string, string, string][] = [
  ["Monthly exports", "5", "∞", "∞"],
  ["Mosaic styles", "3", "10", "10"],
  ["Watermark-free", "—", "✓", "✓"],
  ["PDF book export", "—", "✓", "✓"],
  ["Object Focus (bg removal)", "—", "✓", "✓"],
  ["Before/After generator", "—", "✓", "✓"],
  ["Bulk folder upload", "—", "—", "✓"],
  ["Priority rendering", "—", "—", "✓"],
  ["Commercial license", "—", "—", "✓"],
];

export const FAQ: [string, string][] = [
  ["How does billing work?", "You're billed monthly or yearly via Lemon Squeezy. Yearly plans save 20%. You can switch cadence or plan anytime from your account."],
  ["What's your refund policy?", "Every paid plan includes a 14-day money-back guarantee. Email us within 14 days of purchase for a full refund, no questions asked."],
  ["Can I sell books made with Mosaci?", "Plus lets you publish watermark-free pages. The Pro plan adds a commercial license covering KDP and print-on-demand at any volume."],
  ["Can I change plans later?", "Yes. Upgrades take effect immediately and are prorated; downgrades apply at the end of your current billing period."],
];
