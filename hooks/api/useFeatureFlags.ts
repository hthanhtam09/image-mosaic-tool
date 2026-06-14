"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_FLAGS, type FeatureFlags } from "@/lib/featureFlags";

async function fetchFeatureFlags(): Promise<FeatureFlags> {
  const { data } = await axios.get<FeatureFlags>("/api/feature-flags");
  return data;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_FLAGS,
  });
}

export function useUpdateFeatureFlags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<FeatureFlags>) => {
      const { data } = await axios.put<FeatureFlags>("/api/feature-flags", patch);
      return data;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["feature-flags"] });
      const previous = queryClient.getQueryData<FeatureFlags>(["feature-flags"]);
      if (previous) {
        queryClient.setQueryData<FeatureFlags>(["feature-flags"], {
          ...previous,
          ...patch,
          features: { ...previous.features, ...(patch.features ?? {}) },
          patterns: { ...previous.patterns, ...(patch.patterns ?? {}) },
          themes: { ...previous.themes, ...(patch.themes ?? {}) },
        });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["feature-flags"], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["feature-flags"], data);
    },
  });
}
