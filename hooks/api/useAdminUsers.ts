"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminUser } from "@/components/admin/data";

type OverrideValue = "enabled" | "disabled";

interface UpdateUserPayload {
  userId: string;
  toolEnabled: OverrideValue;
  status: string;
  features: Record<string, boolean>;
  patterns: Record<string, boolean>;
  themes: Record<string, boolean>;
}

async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data } = await axios.get<AdminUser[]>("/api/admin/users");
  return data;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    staleTime: 60 * 1000,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateUserPayload) => {
      const { data } = await axios.put<AdminUser>("/api/admin/users", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
