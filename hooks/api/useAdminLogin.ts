"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";

interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  ok: boolean;
  error?: string;
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { data } = await axios.post<LoginResponse>("/api/auth/login", credentials);
      return data;
    },
  });
}
