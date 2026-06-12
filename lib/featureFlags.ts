// Shared, client-safe feature-flag model. The store lives in
// featureFlags.server.ts; this file holds only types/defaults/metadata so it
// can be imported from both client components and server routes.
import { PATTERNS } from "./colorByNumber/patterns";
import { THEMES } from "./colorByNumber/themes";

export interface ToolFeatureFlags {
  standardImport: boolean;
  objectFocus: boolean;
  folderUpload: boolean;
  beforeAfter: boolean;
  markPractice: boolean;
}

/** A map of catalog id -> whether it is shown to users. */
export type VisibilityMap = Record<string, boolean>;

export interface FeatureFlags {
  /** Master switch - when false, /tools is hidden for everyone. */
  toolEnabled: boolean;
  /** Tool stays reachable but shows a maintenance notice. */
  maintenance: boolean;
  /** Per-feature show/hide inside the Mosaic Tool. */
  features: ToolFeatureFlags;
  /** Which mosaic patterns are shown (by grid-type id). */
  patterns: VisibilityMap;
  /** Which color themes are shown (by theme id). */
  themes: VisibilityMap;
}

// Catalogs of the concrete items an admin can toggle — derived from the tool's
// own pattern/theme definitions so the two never drift apart.
export const PATTERN_CATALOG: { id: string; label: string }[] = PATTERNS.map((p) => ({ id: p.id, label: p.label }));
export const THEME_CATALOG: { id: string; label: string; color: string }[] = THEMES.map((t) => ({
  id: t.id,
  label: t.name,
  color: t.backgroundColor,
}));

const allOn = (ids: string[]): VisibilityMap => Object.fromEntries(ids.map((id) => [id, true]));

export const DEFAULT_FLAGS: FeatureFlags = {
  toolEnabled: true,
  maintenance: false,
  features: {
    standardImport: true,
    objectFocus: true,
    folderUpload: true,
    beforeAfter: true,
    markPractice: true,
  },
  patterns: allOn(PATTERN_CATALOG.map((p) => p.id)),
  themes: allOn(THEME_CATALOG.map((t) => t.id)),
};

export const FEATURE_META: { key: keyof ToolFeatureFlags; name: string; description: string }[] = [
  { key: "standardImport", name: "Standard Import", description: "Convert whole images into mosaic patterns." },
  { key: "objectFocus", name: "Object Focus", description: "Strip white backgrounds to isolate the subject." },
  { key: "folderUpload", name: "Folder Upload (bulk)", description: "Bulk-upload pre-separated color / uncolor / palette folders." },
  { key: "beforeAfter", name: "Before / After generator", description: "Create before/after marketing images per page." },
  { key: "markPractice", name: "Mark Practice", description: "Generate mark-practice sheets for colorists." },
];

// Build a visibility map covering every catalog id; stored values win, anything
// missing defaults to visible (true), and unknown stored ids are dropped.
const mergeVisibility = (ids: string[], stored: VisibilityMap | undefined): VisibilityMap => {
  const out: VisibilityMap = {};
  for (const id of ids) out[id] = stored?.[id] ?? true;
  return out;
};

/** Merge an arbitrary value into a complete, valid FeatureFlags object. */
export function normalizeFlags(value: Partial<FeatureFlags> | null | undefined): FeatureFlags {
  return {
    toolEnabled: value?.toolEnabled ?? DEFAULT_FLAGS.toolEnabled,
    maintenance: value?.maintenance ?? DEFAULT_FLAGS.maintenance,
    features: { ...DEFAULT_FLAGS.features, ...(value?.features ?? {}) },
    patterns: mergeVisibility(PATTERN_CATALOG.map((p) => p.id), value?.patterns),
    themes: mergeVisibility(THEME_CATALOG.map((t) => t.id), value?.themes),
  };
}
