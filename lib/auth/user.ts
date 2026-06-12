export type PlanName = "Free" | "Plus" | "Pro";
export type BillingInterval = "monthly" | "yearly";

export const USERNAME_EMAIL_DOMAIN = "mailinator.com";

export const normalizePlan = (plan?: string | null): PlanName => {
  if (plan === "Plus" || plan === "Pro") return plan;
  return "Free";
};

export const normalizeBillingInterval = (
  billing?: string | null,
): BillingInterval => (billing === "yearly" ? "yearly" : "monthly");

export const emailFromLogin = (value: string) => {
  const input = value.trim().toLowerCase();
  if (!input) return input;
  if (input.includes("@")) return input;
  return `${input}@${USERNAME_EMAIL_DOMAIN}`;
};

export const displayNameFromEmail = (email?: string | null) =>
  email
    ?.split("@")[0]
    ?.split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const userDisplayName = (metadata: Record<string, unknown>, email?: string | null) => {
  const fullName = metadata.full_name || metadata.name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  return displayNameFromEmail(email) || "User";
};

export const userPlan = (
  userMetadata: Record<string, unknown>,
  appMetadata?: Record<string, unknown>,
) => {
  const plan =
    userMetadata.plan ||
    userMetadata.subscription_plan ||
    appMetadata?.plan ||
    appMetadata?.subscription_plan;

  return normalizePlan(typeof plan === "string" ? plan : null);
};

export const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
