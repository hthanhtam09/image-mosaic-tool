"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FLAGS, type FeatureFlags } from "@/lib/featureFlags";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((d: FeatureFlags) => alive && setFlags(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const update = async (patch: Partial<FeatureFlags>) => {
    setFlags((prev) => ({
      ...prev,
      ...patch,
      features: { ...prev.features, ...(patch.features ?? {}) },
      patterns: { ...prev.patterns, ...(patch.patterns ?? {}) },
      themes: { ...prev.themes, ...(patch.themes ?? {}) },
    }));
    setSaving(true);
    try {
      const res = await fetch("/api/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) setFlags(await res.json());
    } catch {
      // keep optimistic value
    } finally {
      setSaving(false);
    }
  };

  return { flags, loading, saving, update };
}
