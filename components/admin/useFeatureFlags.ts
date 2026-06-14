"use client";

import { useFeatureFlags as useFeatureFlagsQuery, useUpdateFeatureFlags } from "@/hooks/api/useFeatureFlags";
import { DEFAULT_FLAGS, type FeatureFlags } from "@/lib/featureFlags";

export function useFeatureFlags() {
  const { data: flags = DEFAULT_FLAGS, isLoading: loading } = useFeatureFlagsQuery();
  const { mutateAsync: mutate, isPending: saving } = useUpdateFeatureFlags();

  const update = async (patch: Partial<FeatureFlags>) => {
    await mutate(patch);
  };

  return { flags, loading, saving, update };
}
