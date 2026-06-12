"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_FLAGS, type FeatureFlags, type ToolFeatureFlags, type VisibilityMap, resolveVisibility } from "@/lib/featureFlags";
import { useToolAccess } from "@/components/tools/useToolAccess";

const FlagsContext = createContext<FeatureFlags>(DEFAULT_FLAGS);

/** Feature flags for individual tool features (e.g. which import modes show). */
export function useToolFeatures(): Record<keyof ToolFeatureFlags, boolean> {
  const flags = useContext(FlagsContext);
  const { role } = useToolAccess();
  return {
    standardImport: resolveVisibility(flags.features.standardImport, role),
    objectFocus: resolveVisibility(flags.features.objectFocus, role),
    folderUpload: resolveVisibility(flags.features.folderUpload, role),
    beforeAfter: resolveVisibility(flags.features.beforeAfter, role),
    markPractice: resolveVisibility(flags.features.markPractice, role),
  };
}

/** Which mosaic patterns are enabled (by grid-type id). */
export function useToolPatterns(): Record<string, boolean> {
  const flags = useContext(FlagsContext);
  const { role } = useToolAccess();
  return Object.fromEntries(
    Object.entries(flags.patterns).map(([id, val]) => [
      id,
      resolveVisibility(val, role),
    ])
  );
}

/** Which color themes are enabled (by theme id). */
export function useToolThemes(): Record<string, boolean> {
  const flags = useContext(FlagsContext);
  const { role } = useToolAccess();
  return Object.fromEntries(
    Object.entries(flags.themes).map(([id, val]) => [
      id,
      resolveVisibility(val, role),
    ])
  );
}

function GateScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[var(--bg-primary)] px-6 text-center text-[var(--text-primary)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-[var(--text-secondary)]">{message}</p>
    </main>
  );
}

export default function ToolFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/feature-flags")
      .then((r) => r.json())
      .then((data: FeatureFlags) => alive && setFlags(data))
      .catch(() => alive && setFlags(DEFAULT_FLAGS));
    return () => {
      alive = false;
    };
  }, []);

  if (flags === null) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)]">
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
          gap: 5, width: 44, height: 44,
          borderRadius: 11, border: '1px solid rgba(192,205,227,0.25)',
          background: 'rgba(192,205,227,0.10)', padding: 7,
        }}>
          <style>{`@keyframes mosaic-pop{0%,100%{transform:scale(1);filter:brightness(1)}30%{transform:scale(1.35) translateY(-2px);filter:brightness(1.4)}60%{transform:scale(1);filter:brightness(1)}}`}</style>
          {([['0s',1],['0.2s',0.5],['0.4s',0.5],['0.6s',1]] as [string,number][]).map(([delay, opacity]) => (
            <i key={delay} style={{ display:'block', borderRadius:3, background:'#c0cde3', opacity, animation:`mosaic-pop 1.6s ease-in-out ${delay} infinite` }} />
          ))}
        </div>
      </main>
    );
  }

  if (!flags.toolEnabled) {
    return <GateScreen title="Tool unavailable" message="The Mosaic Tool is currently disabled by the administrator." />;
  }

  if (flags.maintenance) {
    return <GateScreen title="Under maintenance" message="The Mosaic Tool is temporarily down for maintenance. Please check back soon." />;
  }

  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}
