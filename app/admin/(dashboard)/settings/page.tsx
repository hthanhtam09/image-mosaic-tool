"use client";

import { cardClass, tableCardClass, thClass } from "@/components/admin/data";
import { PageHeader, Toggle } from "@/components/admin/ui";
import { useFeatureFlags } from "@/components/admin/useFeatureFlags";
import { FEATURE_META, PATTERN_CATALOG, THEME_CATALOG, type VisibilityMap } from "@/lib/featureFlags";

type CatalogItem = { id: string; label: string; color?: string };

function countOn(items: CatalogItem[], map: VisibilityMap) {
  return items.filter((it) => map[it.id] !== false).length;
}

function VisibilityTable({
  title,
  description,
  items,
  map,
  onToggle,
}: {
  title: string;
  description: string;
  items: CatalogItem[];
  map: VisibilityMap;
  onToggle: (id: string, next: boolean) => void;
}) {
  return (
    <section className={tableCardClass}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        </div>
        <span className="hidden whitespace-nowrap text-xs text-text-secondary sm:block">
          {countOn(items, map)} / {items.length} shown
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-text-secondary">
            <tr className="border-b border-border-primary">
              <th className={thClass}>Name</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}>Visibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {items.map((it) => {
              const on = map[it.id] !== false;
              return (
                <tr key={it.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {it.color && <span className="h-5 w-5 shrink-0 rounded-md border border-white/15" style={{ background: it.color }} />}
                      <span className="font-medium">{it.label}</span>
                      <span className="font-mono text-xs text-text-muted">{it.id}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${on ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-text-muted"}`}>
                      {on ? "Shown" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      <Toggle on={on} label={`Show ${it.label}`} onChange={() => onToggle(it.id, !on)} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { flags, saving, update } = useFeatureFlags();

  return (
    <>
      <PageHeader title="Settings">
        {saving && <span className="text-xs text-text-secondary">Saving…</span>}
      </PageHeader>

      <div className="space-y-5">
        {/* ── Tool access ── */}
        <section className={cardClass}>
          <h2 className="font-semibold">Tool access</h2>
          <p className="mt-0.5 text-sm text-text-secondary">Global controls for the Mosaic Tool.</p>
          <div className="mt-2 divide-y divide-border-primary">
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">Show Mosaic Tool to users</p>
                <p className="mt-0.5 text-sm text-text-secondary">Master switch. When off, /tools is hidden for everyone.</p>
              </div>
              <Toggle on={flags.toolEnabled} label="Show Mosaic Tool to users" onChange={() => update({ toolEnabled: !flags.toolEnabled })} />
            </div>
            <div className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">Maintenance mode</p>
                <p className="mt-0.5 text-sm text-text-secondary">Keep the tool reachable but show a maintenance notice.</p>
              </div>
              <Toggle on={flags.maintenance} label="Maintenance mode" onChange={() => update({ maintenance: !flags.maintenance })} />
            </div>
          </div>
        </section>

        {/* ── Tool features (table) ── */}
        <section className={tableCardClass}>
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <div>
              <h2 className="font-semibold">Tool features</h2>
              <p className="mt-0.5 text-sm text-text-secondary">Show or hide individual features. Applies to every user immediately.</p>
            </div>
            <span className="hidden text-xs text-text-secondary sm:block">
              {FEATURE_META.filter((f) => flags.features[f.key]).length} / {FEATURE_META.length} on
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-text-secondary">
                <tr className="border-b border-border-primary">
                  <th className={thClass}>Feature</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {FEATURE_META.map((f) => {
                  const on = flags.features[f.key];
                  return (
                    <tr key={f.key}>
                      <td className="px-5 py-4 font-medium">{f.name}</td>
                      <td className="px-5 py-4 text-text-secondary">{f.description}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${on && flags.toolEnabled ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-text-muted"}`}>
                          {on && flags.toolEnabled ? "Visible" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <Toggle on={on} disabled={!flags.toolEnabled} label={f.name} onChange={() => update({ features: { ...flags.features, [f.key]: !on } })} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!flags.toolEnabled && (
            <p className="px-5 py-3 text-xs text-amber-200/80">The tool is hidden globally — feature toggles are disabled until you turn it back on.</p>
          )}
        </section>

        {/* ── Mosaic patterns ── */}
        <VisibilityTable
          title="Mosaic patterns"
          description="Choose exactly which pattern styles appear in the tool's picker (Auto is always available)."
          items={PATTERN_CATALOG}
          map={flags.patterns}
          onToggle={(id, next) => update({ patterns: { ...flags.patterns, [id]: next } })}
        />

        {/* ── Color themes ── */}
        <VisibilityTable
          title="Color themes"
          description="Choose exactly which background color themes users can pick."
          items={THEME_CATALOG}
          map={flags.themes}
          onToggle={(id, next) => update({ themes: { ...flags.themes, [id]: next } })}
        />

        {/* ── General ── */}
        <section className={`${cardClass} max-w-2xl`}>
          <h2 className="mb-4 font-semibold">General</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Workspace name</span>
              <input defaultValue="Mosaci" className="mt-2 h-10 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-sm outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-text-secondary">Support email</span>
              <input defaultValue="support@mosaci.app" className="mt-2 h-10 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-sm outline-none focus:border-accent" />
            </label>
            <button type="button" className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-bg-primary transition hover:bg-accent-hover">
              Save changes
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
