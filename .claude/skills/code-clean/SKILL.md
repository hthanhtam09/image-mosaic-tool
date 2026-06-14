---
name: code-clean
description: >
  Scans a given file path or feature folder for unused variables, functions, imports,
  types, and redundant files. Detects dead code, duplicate logic that can be merged,
  oversized files that should be split into smaller modules, and opportunities to make
  code cleaner and more maintainable. Enforces API call patterns (axios + TanStack Query),
  performance optimizations, naming consistency, and component reuse.
  Use this skill before committing a feature, after a refactor, or whenever you suspect
  code bloat in any TypeScript/TSX file or feature module.
---

# Code Cleanup, Refactoring & Dead Code Elimination

## Project Context

This is **mosaci** (image-mosaic-tool) — a **Next.js 16 / React 19** app with:

- **Tailwind v4** — config via `@theme { ... }` in `app/globals.css`, NOT `tailwind.config.ts`.
  Custom design tokens are CSS variables exposed as Tailwind utilities.
- **No shadcn/ui** — no `@/components/ui/*`, no `DataTable`, no external Skeleton library.
- **No icon library** — no `lucide-react`, no `@heroicons`. Icons are inline SVGs or CSS-driven.
- **Zustand v5** for client state (`store/` directory — 3 stores).
- **Supabase** for auth/data (`utils/supabase/`, `lib/featureFlags*.ts`).
- **axios + TanStack Query** — all API calls MUST use `axios` as the HTTP client and
  `@tanstack/react-query` for server state, caching, and loading/error handling.
  Custom hooks live in `hooks/api/` and follow the `use<Resource><Action>` naming pattern.
- **PostgreSQL** via `pg` pool (`lib/db.ts`) for server-side queries (API routes only).
- **IndexedDB** via `lib/tools/localProjects.ts` for browser project persistence.

### Folder Structure

| Path | What lives here |
|------|----------------|
| `app/` | Next.js App Router — pages, layouts, API routes |
| `app/(marketing)/` | Public marketing pages (home, blog, pricing, login) |
| `app/admin/` | Admin dashboard + admin login |
| `app/studio/` | Main tool interface (projects workspace) |
| `app/tools/` | Legacy routes (redirect to `/studio`) |
| `app/api/` | API routes — auth, admin, feature-flags |
| `components/shared/` | Cross-feature reusable components (AppHeader, Logo) |
| `components/colorByNumber/` | Color-by-number UI (grid, palette, workspace, dashboard) |
| `components/tools/` | Tool shell + user header |
| `components/marketing/` | Marketing page sections (Hero, Pricing, etc.) |
| `components/admin/` | Admin dashboard components |
| `hooks/` | Custom React hooks (image import, export, pan/zoom, access gate) |
| `hooks/api/` | **TanStack Query hooks** for API calls — `use<Resource><Action>.ts` |
| `lib/` | Pure utility/processing logic (no UI, no state) |
| `lib/colorByNumber/` | Image→mosaic conversion, export, patterns, PDF |
| `lib/tools/` | Access tiers, local project CRUD |
| `store/` | Zustand stores (`useColorByNumberStore`, `useBookDesignStore`, `useToastStore`) |
| `utils/supabase/` | Supabase client factories (browser, server, middleware) |

---

## Tailwind Design Tokens

All design tokens are defined in `app/globals.css` `@theme { }`. Never use arbitrary bracket values for anything covered below.

### Color tokens → Tailwind utilities

| CSS variable | Tailwind utility |
|---|---|
| `--color-bg-primary` (#121212) | `bg-bg-primary` |
| `--color-bg-secondary` (#1a1a1a) | `bg-bg-secondary` |
| `--color-bg-tertiary` (#242424) | `bg-bg-tertiary` |
| `--color-text-primary` (#ffffff) | `text-text-primary` |
| `--color-text-secondary` (#9ba3b0) | `text-text-secondary` |
| `--color-text-muted` (#5a5f68) | `text-text-muted` |
| `--color-border-primary` (#262626) | `border-border-primary` |
| `--color-accent` (#c0cde3) | `text-accent` / `bg-accent` / `border-accent` |
| `--color-accent-hover` (#d4deee) | `text-accent-hover` / `bg-accent-hover` |
| `--color-accent-deep` (#8fa3c8) | `text-accent-deep` / `bg-accent-deep` |
| `--color-success` (#6ee7b7) | `text-success` / `bg-success` |
| `--color-warning` (#fbbf24) | `text-warning` / `bg-warning` |
| `--color-error` (#f87171) | `text-error` / `bg-error` |

### CSS variables (for inline styles / non-utility usage)

`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`,
`--text-muted`, `--border-primary`, `--border-subtle`, `--border-default`,
`--accent`, `--accent-primary`, `--accent-secondary`, `--accent-muted`, `--accent-hover`, `--accent-deep`,
`--success`, `--warning`, `--error`,
`--grad` (periwinkle gradient), `--shadow`, `--ring`, `--glow`

### Component utility classes (defined in `globals.css`)

`.card`, `.card-elevated`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-link`, `.btn-sm`, `.btn-lg`,
`.btn-block`, `.bg-grid-pattern`, `.animate-shake`, `.animate-in`, `.fade-in`

---

## Goal

Analyze one or more files / folders for:

1. **Unused imports** — imported symbols never referenced in the file.
2. **Unused variables & constants** — declared but never read.
3. **Unused functions & hooks** — defined locally but never called.
4. **Unused types & interfaces** — declared but never referenced.
5. **Dead branches** — conditions that can never be true / always-true guards.
6. **Redundant files** — files that export nothing used by any other file.
7. **Duplicate / merge candidates** — two or more files that share the same concern.
8. **Code style & readability** — small patterns that can be simplified without changing behaviour.
9. **Tailwind rule compliance** — replace ad-hoc arbitrary values with project design tokens.
10. **Shared component reuse** — replace duplicate UI blocks with existing shared/feature components.
11. **Oversized files / split candidates** — files that have grown too long (≥ ~250 lines).
12. **Loading UX** — replace plain-text "Loading…" placeholders with `animate-pulse` skeleton UI.
13. **API call patterns** — all API calls must use `axios` + TanStack Query hooks in `hooks/api/`.
14. **Performance** — memoization, virtualization, lazy loading, worker offloading where appropriate.
15. **Naming consistency** — file names, component names, and text content must match the feature's actual purpose.

---

## When to Use This Skill

- Before opening a Pull Request for any feature or refactor.
- After moving code between folders.
- When a file grows beyond ~200 lines and feels "busy" (hard split at **~250 lines**).
- When TypeScript reports `no-unused-vars` or ESLint warns about dead code.
- When adding a new API call without a corresponding hook in `hooks/api/`.
- When asked to "clean up", "optimize", "refactor", or "slim down" a file or feature.

---

## Step-by-Step Workflow

### Step 1 — Identify the Scope

| Input from user | Scope to analyze |
|---|---|
| Single file path | That file only |
| Feature folder path | All files inside the feature recursively |
| `components/<name>/` | Full feature component tree |
| Specific sub-folder | e.g. `lib/`, `store/`, `components/`, `hooks/` |

Always resolve **absolute paths** before starting.

---

### Step 2 — Read Each File

For every `.ts` / `.tsx` file in scope:

1. Read the full content.
2. Build a mental map of:
   - Every **import statement** → symbol(s) imported.
   - Every **exported symbol** → name + kind (function, const, type, interface, enum).
   - Every **local declaration** → name + kind.
   - Every **reference / usage** of all of the above.
   - Every **API call** (`fetch(`, `axios.`, `supabase.`).

---

### Step 3 — Detect Issues

Apply the checks below in order. Record for each issue found:
- File path (relative to workspace root) and line number(s).
- Issue category.
- Recommended action.

---

#### 3A — Unused Imports

```
Rule: An import is unused if the imported binding never appears
      in the file body (types, JSX, expressions, function calls).
```

```ts
// ❌ imported but never used
import { useState } from 'react'
import type { SomeType } from '../types'

// ✅ only import what you use
import { useCallback } from 'react'
```

**Action**: Remove the unused import line (or the specific binding from named imports).

**Special case** — type-only imports: keep `import type { ... }` if the project uses `verbatimModuleSyntax`.

---

#### 3B — Unused Variables & Constants

```
Rule: A const / let / var is unused if it is declared but its
      identifier never appears on the right-hand side of an
      assignment, in a JSX expression, in a function call, or
      returned from a function.
```

**Action**: Delete the declaration. If the value is needed elsewhere, move to a shared constants file and export.

---

#### 3C — Unused Functions / Hooks

```
Rule: A function is unused if its identifier is never called
      within the same file AND it is not exported (or exported
      but imported nowhere in the project).
```

**Action**:
- If **not exported** → delete.
- If **exported but unused across the project** → delete.
- If **logic is still valid** → move to `lib/` and document.

---

#### 3D — Unused Types & Interfaces

```
Rule: A type alias or interface is unused if it is never used
      as a type annotation in the file AND not imported elsewhere.
```

**Action**: Delete. If genuinely shared, move to the nearest `types.ts` or inline in the consuming file.

---

#### 3E — Dead Code Branches

```
Rule: A branch is dead if:
      - The condition is always true/false based on surrounding code.
      - It is guarded by a feature flag constant set to a hard-coded value.
      - It follows a `return` statement (unreachable code).
```

**Action**: Remove the dead branch entirely.

---

#### 3F — Redundant Files

A file is redundant when **all** of the following are true:
1. It exports one or more symbols.
2. None of those exports are imported by any other file in the project.
3. It is not an entry point (`layout.tsx`, `page.tsx`, `route.ts`).

**Action**: Propose deletion. Always double-check no dynamic references exist.

---

#### 3G — Merge Candidates (Duplicate Concern)

Two or more files are merge candidates when:
- They share the **same domain concept**.
- They are both small (< 60 lines each) and live in the same folder.
- Merging would not violate folder responsibilities.

**Do NOT merge across responsibility boundaries** — e.g. `lib/` ↔ `store/`, or component ↔ lib.

**Action**: Propose a merge plan with the new filename, new export list, and which files to delete.

---

#### 3H — Code Style & Readability Improvements

Apply only safe, semantics-preserving refactors:

| Pattern | Improvement |
|---|---|
| `x === true` / `x === false` | → `x` / `!x` |
| Deeply nested ternaries (> 2 levels) | → named intermediate variables or early returns |
| `async` function with no `await` | → remove `async` keyword |
| Unnecessary `?.` on non-nullable values | → remove optional chain |
| `useCallback` / `useMemo` wrapping trivial primitives | → remove memo wrapper |
| Multiple `useState` for closely related values | → consider `useReducer` or single object state |
| Unused `React` import (React 17+ JSX transform) | → remove `import React from "react"` |
| Inline theme colors as style objects | → use Tailwind utility classes or CSS variables |
| `DirectImage` type defined in multiple hooks | → centralize in `lib/colorByNumber/types.ts` |

---

#### 3I — Tailwind Utility Compliance (No Ad-hoc Arbitrary Values)

**Bad examples:**
```tsx
<p className="text-[#ffffff]">...</p>
<div className="bg-[#121212] px-[13px]">...</div>
<p className="text-[16px]">...</p>
```

**Good examples:**
```tsx
<p className="text-text-primary">...</p>
<div className="bg-bg-primary px-3">...</div>
<p className="text-base">...</p>
```

**Action**:
- Replace arbitrary color/spacing utilities with named design token utilities.
- Replace inline `style={{ background: '#121212' }}` with `bg-bg-primary`.
- If a value truly has no equivalent in the theme, add it to the `@theme` block in `app/globals.css` first, then consume via the new named utility.
- Do not keep bracket-based arbitrary values for standard typography/spacing/color.

---

#### 3J — Shared Component Reuse (No New Duplicate Components)

```
Rule: Before accepting any newly added UI component, verify whether an
      equivalent component already exists in components/shared/ or the
      relevant feature folder. If yes, extend it instead of duplicating.
```

Checks:
1. Search `components/shared/` and relevant feature `components/` for existing equivalents.
2. If existing component covers ≥80% of the use case, extend it minimally.
3. Remove duplicate newly-created component and update imports.

**Action**: Prefer reuse over creation. Consolidate duplicated UI blocks.

---

#### 3K — Icon Usage Compliance (No Text/Emoji Icons)

```
Rule: This project uses inline SVG icons. Do not use text characters or
      emoji (e.g. ✅, ✕, →) as visual icons in production UI.
```

**Bad examples:**
```tsx
<span>✅</span>
<button>→</button>
```

**Good example** — use an inline SVG matching the pattern already used in the codebase:
```tsx
<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <path d="..." stroke="currentColor" strokeWidth="1.5" />
</svg>
```

**Action**: Replace text/emoji pseudo-icons with inline SVGs consistent with existing icon patterns.

---

#### 3L — Oversized Files & Split Candidates

```
Rule: Do not keep one file unnecessarily long. If a file is large or mixes
      several concerns, split it into smaller files along clear boundaries.
```

**Heuristics:**

| Signal | Action |
|---|---|
| **≥ ~250 lines** in a single `.ts` / `.tsx` file | Strong split candidate — extract subcomponents, hooks, helpers. |
| **~200–250 lines** with multiple unrelated sections | Consider splitting before it grows further. |
| One component file mixing data fetching + large JSX + helpers | Split: hooks → `hooks/` sub-file, pure helpers → `lib/`, sub-UI → sibling component. |
| Zustand store mixing 3+ unrelated concerns | Split into sub-stores, each with a single domain. |

**Do NOT split blindly** — each resulting file should have one clear responsibility.

**Action**: Propose a **split plan**: list new file paths, what moves where, and how the original file imports them.

---

#### 3M — Loading States Must Have Visual Structure

```
Rule: Any user-visible loading state must have visual structure — not just
      a text paragraph that says "Loading…". This project has NO external
      skeleton library. Build inline skeleton UI using Tailwind animate-pulse.
```

**Pattern for inline skeleton blocks:**
```tsx
{isLoading ? (
  <div className="animate-pulse space-y-3" aria-busy aria-label="Loading">
    <div className="h-8 w-48 rounded bg-bg-tertiary" />
    <div className="h-32 w-full rounded-lg bg-bg-tertiary" />
    <div className="h-4 w-64 rounded bg-bg-tertiary" />
  </div>
) : (
  <ActualContent />
)}
```

**Bad examples:**
```tsx
{isLoading ? <p>Loading…</p> : <Content />}
{isLoading && <span className="text-text-muted">Loading…</span>}
```

**Action**: Replace text-only loading branches with `animate-pulse` skeleton blocks that approximate the layout being loaded. Add `aria-busy` and `aria-label` on the container.

---

#### 3N — API Call Patterns (axios + TanStack Query)

```
Rule: ALL client-side API calls to Next.js API routes must:
      1. Use `axios` as the HTTP client (NOT raw `fetch()`).
      2. Be wrapped in a TanStack Query hook in hooks/api/.
      3. Follow the use<Resource><Action> naming convention.

      Supabase SDK calls (.auth.getUser(), .from().select(), etc.) are exempt —
      they are already abstracted.
```

**Hook file location:** `hooks/api/use<Resource><Action>.ts`

**Naming convention:**
- `useUsers()` — GET list
- `useUser(id)` — GET single
- `useCreateUser()` — POST / mutation
- `useUpdateUser()` — PUT/PATCH / mutation
- `useDeleteUser()` — DELETE / mutation
- `useFeatureFlags()` — GET feature flags
- `useAdminLogin()` — POST auth / mutation

**Standard query hook pattern:**
```ts
// hooks/api/useFeatureFlags.ts
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'

async function fetchFeatureFlags() {
  const { data } = await axios.get<FeatureFlagsResponse>('/api/feature-flags')
  return data
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000, // 5 min
  })
}
```

**Standard mutation hook pattern:**
```ts
// hooks/api/useAdminLogin.ts
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'

async function adminLogin(credentials: { username: string; password: string }) {
  const { data } = await axios.post<{ ok: boolean }>('/api/auth/login', credentials)
  return data
}

export function useAdminLogin() {
  return useMutation({ mutationFn: adminLogin })
}
```

**Bad examples (raw fetch — must be migrated):**
```ts
// ❌ raw fetch in a component
const res = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
})
const data = await res.json()

// ❌ raw fetch in a store action
const res = await fetch('/api/feature-flags')
const flags = await res.json()
```

**Action:**
1. Install `axios` and `@tanstack/react-query` if not already present in `package.json`.
2. Create `hooks/api/use<Resource><Action>.ts` for each API call found.
3. Replace inline `fetch()` calls in components, stores, and hooks with the new query/mutation hook.
4. Wrap the app with `<QueryClientProvider>` in `app/layout.tsx` if not already done.
5. Use `isLoading`, `isError`, `data` from the hook return value to drive UI state.

**QueryClientProvider setup (if missing):**
```tsx
// app/layout.tsx (or a providers wrapper)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

---

#### 3O — Performance Issues

```
Rule: Identify and fix patterns that cause unnecessary re-renders,
      wasted computation, or poor UX under load.
```

| Pattern | Fix |
|---|---|
| Large component re-renders on every parent update | Wrap with `React.memo()` if props rarely change |
| Expensive calculation inside render | Move inside `useMemo()` |
| Callback recreated on every render | Wrap with `useCallback()` |
| Heavy component loaded eagerly | Use `React.lazy()` + `Suspense` |
| Large list rendered without virtualization | Implement windowing (custom scroll offset or react-window) |
| CPU-intensive work on main thread | Offload to Web Worker (already used in project for conversion/patterns) |
| `useColorByNumberStore()` full subscription in component | Use fine-grained selectors: `useColorByNumberStore(s => s.activeProjectId)` |
| TanStack Query with no `staleTime` | Set appropriate `staleTime` to avoid redundant refetches |

**Zustand selector rule:**
```ts
// ❌ subscribes to entire store, re-renders on any change
const store = useColorByNumberStore()

// ✅ only re-renders when activeProjectId changes
const activeProjectId = useColorByNumberStore(s => s.activeProjectId)
```

---

#### 3P — Naming Consistency

```
Rule: File names, component names, exported function names, and user-visible
      text content must accurately reflect the feature or domain they belong to.
      Stale names from copy-pasted or renamed features must be corrected.
```

Checks:
1. Component name matches file name (e.g. `ProjectCard.tsx` exports `ProjectCard`).
2. Hook name matches file name (e.g. `useFeatureFlags.ts` exports `useFeatureFlags`).
3. Store name matches file name (e.g. `useBookDesignStore.ts` exports `useBookDesignStore`).
4. User-visible text (labels, headings, placeholders, button text) matches the feature's actual purpose.
5. API route path matches the resource it operates on.
6. Constant/variable names are not misleading (e.g. `PAGE_SIZE` used as a timeout).

**Action**: Rename file, component, or text to reflect actual purpose. Update all import paths and usages.

---

### Step 4 — Report Findings

Produce a structured report in this format:

```
## Code Cleanup Report — <path>
Generated: <date>

### Summary
| Category                | Count |
|-------------------------|-------|
| Unused imports          | N     |
| Unused variables        | N     |
| Unused functions        | N     |
| Unused types            | N     |
| Dead branches           | N     |
| Redundant files         | N     |
| Merge candidates        | N     |
| Split candidates        | N     |
| Style improvements      | N     |
| Tailwind violations     | N     |
| Component duplication   | N     |
| Icon violations         | N     |
| Loading (text-only)     | N     |
| API pattern violations  | N     |
| Performance issues      | N     |
| Naming inconsistencies  | N     |
| **Total issues**        | **N** |

---

### Unused Imports
- `components/colorByNumber/Dashboard.tsx` line 3: `import { useState }` — never used → **DELETE**

### API Pattern Violations
- `components/admin/ui.tsx` line 44: `fetch('/api/admin/users')` — must migrate to `hooks/api/useUsers.ts` with axios + useQuery → **CREATE HOOK + REPLACE**

### Performance Issues
- `store/useColorByNumberStore.ts` line 82: `const store = useColorByNumberStore()` in component — subscribes to entire store → **USE FINE-GRAINED SELECTOR**

### Naming Inconsistencies
- `app/tool/page.tsx`: route `/tool` → verify if legacy redirect is intentional or should be renamed.

### Tailwind Violations
- `components/tools/ToolsShell.tsx` lines 35–50: inline style object redefines theme colors → **REPLACE** with Tailwind utilities

### Split Candidates
- `store/useColorByNumberStore.ts` (~520 lines) → **SPLIT** into `store/useProjectStore.ts`, `store/useConversionJobStore.ts`, `store/useWorkspaceUIStore.ts`

### Loading (text-only)
- `components/colorByNumber/dashboard/ProjectGrid.tsx` line 88: `{isLoading ? <p>Loading…</p> : ...}` → **REPLACE** with `animate-pulse` skeleton blocks.
```

---

### Step 5 — Apply Changes

After presenting the report, apply fixes **one category at a time** in this order:

1. Remove unused imports (lowest risk).
2. Remove unused variables / constants.
3. Remove unused functions & types.
4. Remove dead branches.
5. Delete redundant files (verify zero references first).
6. Execute merges (create new file → copy content → delete originals → update imports).
7. **Execute splits** for oversized files (new files per split plan → thin orchestrator in original path → update imports). Do this **before** cosmetic refactors.
8. Migrate API calls → create `hooks/api/` hooks with axios + TanStack Query, replace raw `fetch()`.
9. Apply style improvements & Tailwind compliance fixes.
10. Fix performance issues (selectors, memoization, lazy loading).
11. Fix naming inconsistencies (rename files, components, text content).
12. Replace duplicated components with existing reusable components.
13. Add missing design tokens to `app/globals.css` `@theme` block and migrate usage.
14. Replace text/emoji pseudo-icons with inline SVGs.
15. Replace text-only loading UI with `animate-pulse` skeleton blocks.

**For each change:**
- Use the file edit tools to make the modification.
- Never delete a file without first verifying zero references (grep across the workspace).
- After deleting, merging, or splitting files, scan all import paths and remove stale references.
- Run a final grep to confirm no broken import paths remain.
- After adding a TanStack Query hook, verify `QueryClientProvider` wraps the consuming component tree.

---

### Step 6 — Verify

After all changes:

1. Confirm no TypeScript errors by checking that all remaining imports resolve.
2. Summarize total lines removed and files deleted, merged, or split.
3. Confirm no avoidable Tailwind arbitrary utility remains.
4. Confirm no raw `fetch()` calls to internal API routes remain — all go through `hooks/api/`.
5. Confirm `QueryClientProvider` is present in `app/layout.tsx` or a providers wrapper.
6. Confirm all newly introduced UI is mapped to existing reusable components where available.
7. Confirm typography/spacing/color classes avoid bracket syntax.
8. Confirm icon rendering uses inline SVGs and not text/emoji symbols.
9. After splits, confirm no circular imports, each new file has one responsibility, orchestrator files stay within the **~200–250 line** guideline.
10. Confirm loading states use `animate-pulse` skeleton blocks, not text-only placeholders.
11. Confirm Zustand store subscriptions use fine-grained selectors.
12. Confirm component names, file names, and user-visible text match their actual feature/purpose.

---

## Grep Patterns (Quick Reference)

| What to find | Query pattern |
|---|---|
| Import of a specific name | `import.*MyName` |
| Usage of a variable/function | `\bMyName\b` |
| All exports in a file | `^export` |
| All local declarations | `^const \|^let \|^function \|^type \|^interface ` |
| Files importing from a specific path | `from ["'].*my-file["']` |
| Arbitrary Tailwind color values | `\[#[0-9a-fA-F]` |
| Text/emoji icons | `[✅✕→←↑↓⚠️❌🔥]` |
| Text-only loading | `isLoading.*<p\|isLoading.*<span` |
| Raw fetch calls to API routes | `fetch\(['"]\/api` |
| Inline style theme colors | `style=.*#[0-9a-fA-F]` |
| Entire store subscription | `useColorByNumberStore\(\)` |
| DirectImage type duplication | `DirectImage` |

---

## Hard Rules

1. **Never delete an export without grepping** for its usage across the entire project first.
2. **Never merge files across folder responsibility boundaries** (e.g. `lib/` ↔ `store/`).
3. **Never touch test files** unless explicitly asked.
4. **Never rename a public API** (exported symbol used outside the feature) — only remove if truly unused.
5. **After any deletion**, update all import paths in files that referenced the deleted file.
6. **Preserve all inline comments** that document business intent — remove only comments that describe deleted code.
7. **Do not change runtime behaviour** — cleanup is purely structural and cosmetic.
8. **Never use arbitrary Tailwind values** when an existing project design token utility already exists.
9. **Never keep a newly created duplicate component** when an equivalent shared/feature reusable component already exists.
10. **Always search existing components first** before accepting or introducing new UI component files.
11. **If a needed Tailwind utility does not exist, define it in `app/globals.css` `@theme` block** and use the new named class.
12. **Never use text/emoji as UI icons** — use inline SVGs consistent with existing codebase patterns.
13. **Do not leave oversized monolithic files** when a split along responsibility boundaries would improve clarity.
14. **Never use text-only loading** for primary page content — use `animate-pulse` skeleton blocks.
15. **Never use raw `fetch()` for internal API routes in client components** — use axios + TanStack Query hooks in `hooks/api/`.
16. **Always use fine-grained Zustand selectors** — never subscribe to the entire store object in a component.
17. **Never leave a naming mismatch** between a file's name and its primary exported symbol or user-visible purpose.

---

## Quick Checklist

Before marking cleanup complete:

- [ ] No unused imports remain in any modified file.
- [ ] No unused variables, constants, or function declarations remain.
- [ ] No unused type / interface declarations remain.
- [ ] All dead code branches removed.
- [ ] All redundant files deleted and their imports cleaned up.
- [ ] All merge operations completed and old files deleted.
- [ ] Oversized files split where applicable; no avoidable "god modules" above ~250 lines.
- [ ] Zero broken import paths in the project.
- [ ] No TypeScript errors introduced.
- [ ] No invalid/avoidable Tailwind arbitrary utilities remain (no `[#hex]`, no `[Npx]` for standard sizes).
- [ ] No inline style objects redefining theme colors — use Tailwind utilities or CSS variables.
- [ ] New UI code reuses existing shared/feature components where available; no duplicate component left.
- [ ] Missing utilities are defined in `app/globals.css` `@theme` and consumed via named classes.
- [ ] UI icons are inline SVGs; no emoji/text pseudo-icons remain.
- [ ] Loading states use `animate-pulse` skeleton blocks, not text-only "Loading…" placeholders.
- [ ] All client-side API calls to internal routes use axios + TanStack Query hooks in `hooks/api/`.
- [ ] `QueryClientProvider` wraps the component tree consuming TanStack Query hooks.
- [ ] Zustand store subscriptions use fine-grained selectors (`s => s.field`), not full store objects.
- [ ] File names, component names, and user-visible text match their actual feature/purpose.
- [ ] Cleanup report delivered to user with before/after line count.
