"use client";

import { cardClass, tableCardClass } from "@/components/admin/data";
import { PageHeader, Toggle } from "@/components/admin/ui";
import { useFeatureFlags } from "@/components/admin/useFeatureFlags";
import { FEATURE_META, PATTERN_CATALOG, THEME_CATALOG, normalizeValue, type VisibilityMap } from "@/lib/featureFlags";

type CatalogItem = { id: string; label: string; color?: string };

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
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <div>
          <h2 className="font-semibold text-sm">{title}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
        </div>
        <span className="hidden whitespace-nowrap text-xs text-text-secondary sm:block">
          {items.filter((it) => normalizeValue(map[it.id]).guest).length} / {items.length}
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-text-secondary border-b border-border-primary bg-bg-primary/30">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-center font-medium w-28">Guest Visibility</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-primary">
            {items.map((it) => {
              const val = normalizeValue(map[it.id]);
              const on = val.guest;
              return (
                <tr key={it.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {it.color && <span className="h-4 w-4 shrink-0 rounded border border-white/15" style={{ background: it.color }} />}
                      <span className="font-medium">{it.label}</span>
                      <span className="font-mono text-[10px] text-text-muted">{it.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-center">
                      <Toggle
                        on={on}
                        label={`Show ${it.label} for Guest`}
                        onChange={() => onToggle(it.id, !on)}
                      />
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
          <h2 className="font-semibold text-sm">Tool access</h2>
          <p className="mt-0.5 text-xs text-text-secondary">Global controls for the Mosaic Tool.</p>
          <div className="mt-2 divide-y divide-border-primary">
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">Show Mosaic Tool to users</p>
                <p className="mt-0.5 text-xs text-text-secondary">Master switch. When off, /tools is hidden for everyone.</p>
              </div>
              <Toggle on={flags.toolEnabled} label="Show Mosaic Tool to users" onChange={() => update({ toolEnabled: !flags.toolEnabled })} />
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">Maintenance mode</p>
                <p className="mt-0.5 text-xs text-text-secondary">Keep the tool reachable but show a maintenance notice.</p>
              </div>
              <Toggle on={flags.maintenance} label="Maintenance mode" onChange={() => update({ maintenance: !flags.maintenance })} />
            </div>
          </div>
        </section>

        {/* ── Tool features (table) ── */}
        <section className={tableCardClass}>
          <div className="flex items-center justify-between gap-3 px-4 pt-4">
            <div>
              <h2 className="font-semibold text-sm">Tool features (Guest)</h2>
              <p className="mt-0.5 text-xs text-text-secondary">Choose which features guest users can access.</p>
            </div>
            <span className="hidden text-xs text-text-secondary sm:block">
              {FEATURE_META.filter((f) => normalizeValue(flags.features[f.key]).guest).length} / {FEATURE_META.length}
            </span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-text-secondary border-b border-border-primary bg-bg-primary/30">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Feature</th>
                  <th className="px-4 py-2.5 text-left font-medium">Description</th>
                  <th className="px-4 py-2.5 text-center font-medium w-28">Guest Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {FEATURE_META.map((f) => {
                  const val = normalizeValue(flags.features[f.key]);
                  const on = val.guest;
                  return (
                    <tr key={f.key} className="hover:bg-white/5 transition">
                      <td className="px-4 py-2 font-medium">{f.name}</td>
                      <td className="px-4 py-2 text-text-secondary">{f.description}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-center">
                          <Toggle
                            on={on}
                            disabled={!flags.toolEnabled}
                            label={`${f.name} for Guest`}
                            onChange={() => {
                              update({
                                features: {
                                  ...flags.features,
                                  [f.key]: {
                                    ...val,
                                    guest: !on,
                                  },
                                },
                              });
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!flags.toolEnabled && (
            <p className="px-4 py-2 text-xs text-amber-200/80">The tool is hidden globally — feature toggles are disabled until you turn it back on.</p>
          )}
        </section>

        {/* ── Side-by-side Tables ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* ── Mosaic patterns ── */}
          <VisibilityTable
            title="Mosaic patterns (Guest)"
            description="Toggle picker patterns for Guest users."
            items={PATTERN_CATALOG}
            map={flags.patterns}
            onToggle={(id, next) => {
              const currentVal = normalizeValue(flags.patterns[id]);
              update({
                patterns: {
                  ...flags.patterns,
                  [id]: {
                    ...currentVal,
                    guest: next,
                  },
                },
              });
            }}
          />

          {/* ── Color themes ── */}
          <VisibilityTable
            title="Color themes (Guest)"
            description="Toggle picker themes for Guest users."
            items={THEME_CATALOG}
            map={flags.themes}
            onToggle={(id, next) => {
              const currentVal = normalizeValue(flags.themes[id]);
              update({
                themes: {
                  ...flags.themes,
                  [id]: {
                    ...currentVal,
                    guest: next,
                  },
                },
              });
            }}
          />
        </div>

        {/* ── General ── */}
        <section className={`${cardClass} max-w-2xl`}>
          <h2 className="mb-3 font-semibold text-sm">General</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-text-secondary">Workspace name</span>
              <input defaultValue="Mosaci" className="mt-1 h-9 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-xs outline-none focus:border-accent" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-text-secondary">Support email</span>
              <input defaultValue="support@mosaci.app" className="mt-1 h-9 w-full rounded-lg border border-border-primary bg-bg-primary px-3 text-xs outline-none focus:border-accent" />
            </label>
            <button type="button" className="h-9 rounded-lg bg-accent px-4 text-xs font-semibold text-bg-primary transition hover:bg-accent-hover">
              Save changes
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
