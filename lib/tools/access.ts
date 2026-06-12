import type { PlanName } from "@/lib/auth/user";

export type ToolRole = "guest" | "free" | "plus" | "pro";

export type ToolAccess = {
  role: ToolRole;
  plan: PlanName | "Guest";
  isLoading: boolean;
  isGuest: boolean;
  isPro: boolean;
  maxFilesPerImport: number;
  maxFilesPerProject: number;
  maxConvertAtOnce: number;
  maxSavedProjects: number;
  maxPdfItems: number;
  canUseRecentProjects: boolean;
  canUseMultipleProjects: boolean;
  canUsePremiumPresets: boolean;
  canUseFolderUpload: boolean;
  canUseBeforeAfter: boolean;
  canUseMarkPractice: boolean;
  canExportZip: boolean;
  canExportWithoutWatermark: boolean;
  canCommercialUse: boolean;
  canCloudSync: boolean;
};

export const guestToolAccess: ToolAccess = {
  role: "guest",
  plan: "Guest",
  isLoading: false,
  isGuest: true,
  isPro: false,
  maxFilesPerImport: 3,
  maxFilesPerProject: 3,
  maxConvertAtOnce: 3,
  maxSavedProjects: 1,
  maxPdfItems: 3,
  canUseRecentProjects: false,
  canUseMultipleProjects: false,
  canUsePremiumPresets: false,
  canUseFolderUpload: false,
  canUseBeforeAfter: false,
  canUseMarkPractice: false,
  canExportZip: false,
  canExportWithoutWatermark: false,
  canCommercialUse: false,
  canCloudSync: false,
};

export const buildToolAccess = (
  plan: PlanName | null,
  isLoading = false,
): ToolAccess => {
  if (isLoading) return { ...guestToolAccess, isLoading: true };
  if (!plan) return guestToolAccess;

  const isPro = plan === "Plus" || plan === "Pro";
  if (!isPro) {
    return {
      ...guestToolAccess,
      role: "free",
      plan: "Free",
      isGuest: false,
      maxSavedProjects: 3,
      canUseRecentProjects: true,
      canUseMultipleProjects: true,
    };
  }

  return {
    role: plan === "Pro" ? "pro" : "plus",
    plan,
    isLoading: false,
    isGuest: false,
    isPro: true,
    maxFilesPerImport: plan === "Pro" ? 200 : 50,
    maxFilesPerProject: plan === "Pro" ? 500 : 100,
    maxConvertAtOnce: plan === "Pro" ? 200 : 50,
    maxSavedProjects: 50,
    maxPdfItems: plan === "Pro" ? 500 : 100,
    canUseRecentProjects: true,
    canUseMultipleProjects: true,
    canUsePremiumPresets: true,
    canUseFolderUpload: true,
    canUseBeforeAfter: true,
    canUseMarkPractice: true,
    canExportZip: true,
    canExportWithoutWatermark: true,
    canCommercialUse: true,
    canCloudSync: plan === "Pro",
  };
};

export const basicPatternIds = new Set(["auto", "standard", "honeycomb", "diamond"]);
export const basicThemeIds = new Set(["light", "dark"]);
