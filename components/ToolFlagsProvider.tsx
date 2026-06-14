"use client";

import { createContext, useContext, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { DEFAULT_FLAGS, type FeatureFlags, type ToolFeatureFlags, type VisibilityMap, resolveVisibility } from "@/lib/featureFlags";
import { useToolAccess } from "@/components/tools/useToolAccess";
import { useFeatureFlags } from "@/hooks/api/useFeatureFlags";

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
    <main className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-bg-primary px-6 text-center text-text-primary">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border-primary bg-bg-secondary text-text-secondary">
        <LockKeyhole size={24} strokeWidth={2} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-bg-primary">
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

export default function ToolFlagsProvider({ children }: { children: ReactNode }) {
  const { data: flags, isLoading } = useFeatureFlags();

  if (isLoading || !flags) {
    return <LoadingScreen />;
  }

  if (!flags.toolEnabled) {
    return <GateScreen title="Tool unavailable" message="The Mosaic Tool is currently disabled by the administrator." />;
  }

  if (flags.maintenance) {
    return <GateScreen title="Under maintenance" message="The Mosaic Tool is temporarily down for maintenance. Please check back soon." />;
  }

  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}
