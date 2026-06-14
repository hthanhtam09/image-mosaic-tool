/**
 * Canonical plan configuration — single source of truth for plan names,
 * pricing, limits, feature flags, and copy.
 *
 * Import from here instead of hardcoding "Free", "Plus", "Pro" strings.
 */

import type { PlanName } from "@/lib/auth/user";

// ─── Plan identifiers ───────────────────────────────────────────────────────

export const PLAN = {
  FREE: "Free" as PlanName,
  PLUS: "Plus" as PlanName,
  PRO: "Pro" as PlanName,
} as const;

export const ALL_PLANS = [PLAN.FREE, PLAN.PLUS, PLAN.PRO] as const;

// ─── Pricing ────────────────────────────────────────────────────────────────

/** Monthly price in USD for each plan. */
export const PLAN_PRICE_MONTHLY: Record<PlanName, number> = {
  Free: 0,
  Plus: 19,
  Pro: 49,
};

/** Yearly price in USD (per month, billed annually) for each plan. */
export const PLAN_PRICE_YEARLY: Record<PlanName, number> = {
  Free: 0,
  Plus: 15,
  Pro: 39,
};

/** Formatted monthly price string (e.g. "$19"). */
export const PLAN_PRICE_DISPLAY: Record<PlanName, string> = {
  Free: "$0",
  Plus: "$19",
  Pro: "$49",
};

// ─── CTA labels ─────────────────────────────────────────────────────────────

export const PLAN_CTA: Record<PlanName, string> = {
  Free: "Start free",
  Plus: "Get Plus",
  Pro: "Get Pro",
};

/** Label for upgrading from a lower plan. */
export const PLAN_UPGRADE_CTA: Record<PlanName, string> = {
  Free: "Upgrade",
  Plus: "Upgrade to Plus",
  Pro: "Upgrade to Pro",
};

// ─── Short descriptions ──────────────────────────────────────────────────────

export const PLAN_DESC: Record<PlanName, string> = {
  Free: "For trying things out",
  Plus: "For active creators",
  Pro: "For teams & volume",
};

// ─── Feature lists (marketing copy) ─────────────────────────────────────────

export const PLAN_FEATURES: Record<PlanName, string[]> = {
  Free: ["5 exports / month", "3 mosaic styles", "Watermark on exports"],
  Plus: [
    "Unlimited exports",
    "All 10 styles · no watermark",
    "PDF book export",
    "Before/After · Object Focus",
  ],
  Pro: [
    "Everything in Plus",
    "Bulk folder upload",
    "Priority rendering",
    "Commercial license",
  ],
};

// ─── Billing interval labels ─────────────────────────────────────────────────

export const BILLING_INTERVAL_LABEL = {
  monthly: "month",
  yearly: "month, billed yearly",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the plan grants paid (Plus or Pro) access. */
export const isPaidPlan = (plan: PlanName): boolean =>
  plan === PLAN.PLUS || plan === PLAN.PRO;

/** Returns the upgrade CTA for a given plan, falling back to generic "Upgrade". */
export const getUpgradeCta = (plan: PlanName): string =>
  PLAN_UPGRADE_CTA[plan] ?? "Upgrade";
