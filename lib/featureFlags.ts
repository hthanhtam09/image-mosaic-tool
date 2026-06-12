// Shared, client-safe feature-flag model. The store lives in
// featureFlags.server.ts; this file holds only types/defaults/metadata so it
// can be imported from both client components and server routes.
import { PATTERNS } from "./colorByNumber/patterns";
import { THEMES } from "./colorByNumber/themes";
import type { ToolRole } from "./tools/access";

export interface RoleVisibility {
  guest: boolean;
  free: boolean;
  plus: boolean;
  pro: boolean;
}

export type FeatureValue = boolean | RoleVisibility;

export interface ToolFeatureFlags {
  standardImport: FeatureValue;
  objectFocus: FeatureValue;
  folderUpload: FeatureValue;
  beforeAfter: FeatureValue;
  markPractice: FeatureValue;
}

/** A map of catalog id -> whether it is shown to users. */
export type VisibilityMap = Record<string, FeatureValue>;

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
export const PATTERN_CATALOG: { id: string; label: string }[] = [
  ...PATTERNS.map((p) => ({ id: p.id, label: p.label })),
  { id: "square-mark", label: "Square Mark" },
  { id: "hexagon-mark", label: "Hexagon Mark" },
];
export const THEME_CATALOG: { id: string; label: string; color: string }[] = THEMES.map((t) => ({
  id: t.id,
  label: t.name,
  color: t.backgroundColor,
}));

export const ROLES: { id: ToolRole; label: string }[] = [
  { id: "guest", label: "Guest" },
  { id: "free", label: "Free" },
  { id: "plus", label: "Plus" },
  { id: "pro", label: "Pro" },
];

const allRolesOn = (): RoleVisibility => ({ guest: true, free: true, plus: true, pro: true });

export const DEFAULT_FLAGS: FeatureFlags = {
  toolEnabled: true,
  maintenance: false,
  features: {
    standardImport: { guest: true, free: true, plus: true, pro: true },
    objectFocus: { guest: false, free: false, plus: true, pro: true },
    folderUpload: { guest: false, free: false, plus: true, pro: true },
    beforeAfter: { guest: false, free: false, plus: true, pro: true },
    markPractice: { guest: false, free: false, plus: true, pro: true },
  },
  patterns: Object.fromEntries(PATTERN_CATALOG.map((p) => [p.id, allRolesOn()])),
  themes: Object.fromEntries(THEME_CATALOG.map((t) => [t.id, allRolesOn()])),
};

export const FEATURE_META: { key: keyof ToolFeatureFlags; name: string; description: string }[] = [
  { key: "standardImport", name: "Standard Import", description: "Convert whole images into mosaic patterns." },
  { key: "objectFocus", name: "Object Focus", description: "Strip white backgrounds to isolate the subject." },
  { key: "folderUpload", name: "Folder Upload (bulk)", description: "Bulk-upload pre-separated color / uncolor / palette folders." },
  { key: "beforeAfter", name: "Before / After generator", description: "Create before/after marketing images per page." },
  { key: "markPractice", name: "Mark Practice", description: "Generate mark-practice sheets for colorists." },
];

export const normalizeValue = (val: unknown): RoleVisibility => {
  if (typeof val === "boolean") {
    return { guest: val, free: val, plus: val, pro: val };
  }
  const v = val as Partial<RoleVisibility> | null | undefined;
  return {
    guest: v?.guest ?? true,
    free: v?.free ?? true,
    plus: v?.plus ?? true,
    pro: v?.pro ?? true,
  };
};

const mergeVisibility = (ids: string[], stored: VisibilityMap | undefined): VisibilityMap => {
  const out: VisibilityMap = {};
  for (const id of ids) {
    out[id] = normalizeValue(stored?.[id]);
  }
  return out;
};

/** Merge an arbitrary value into a complete, valid FeatureFlags object. */
export function normalizeFlags(value: Partial<FeatureFlags> | null | undefined): FeatureFlags {
  const defaultFeatures = DEFAULT_FLAGS.features;
  const valFeatures = value?.features;
  return {
    toolEnabled: value?.toolEnabled ?? DEFAULT_FLAGS.toolEnabled,
    maintenance: value?.maintenance ?? DEFAULT_FLAGS.maintenance,
    features: {
      standardImport: normalizeValue(valFeatures?.standardImport ?? defaultFeatures.standardImport),
      objectFocus: normalizeValue(valFeatures?.objectFocus ?? defaultFeatures.objectFocus),
      folderUpload: normalizeValue(valFeatures?.folderUpload ?? defaultFeatures.folderUpload),
      beforeAfter: normalizeValue(valFeatures?.beforeAfter ?? defaultFeatures.beforeAfter),
      markPractice: normalizeValue(valFeatures?.markPractice ?? defaultFeatures.markPractice),
    },
    patterns: mergeVisibility(PATTERN_CATALOG.map((p) => p.id), value?.patterns),
    themes: mergeVisibility(THEME_CATALOG.map((t) => t.id), value?.themes),
  };
}

export function resolveVisibility(val: FeatureValue | undefined, role: ToolRole): boolean {
  if (val === undefined) return true;
  if (typeof val === "boolean") return val;
  return val[role] ?? true;
}

