"use client";

import axios from "axios";
import { useMutation } from "@tanstack/react-query";

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await axios.post("/api/auth/logout");
    },
  });
}
