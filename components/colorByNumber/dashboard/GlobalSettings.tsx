"use client";

import { THEMES } from "@/lib/colorByNumber/themes";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import type { ColorByNumberGridType } from "@/lib/colorByNumber";
import { useEffect, useRef } from "react";

interface GlobalSettingsProps {
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
}

const GRID_TYPE_OPTIONS: { value: ColorByNumberGridType | 'auto'; label: string }[] = [
    { value: 'auto', label: 'Auto (Cycle)' },
    { value: 'standard', label: 'Square' },
    { value: 'honeycomb', label: 'Circle' },
    { value: 'diamond', label: 'Diamond' },
    { value: 'pentagon', label: 'Hexagon' },
    { value: 'puzzle', label: 'Puzzle' },
    { value: 'islamic', label: 'Islamic' },
    { value: 'fish-scale', label: 'Fish Scale' },
    { value: 'trapezoid', label: 'Trapezoid' },
];

export default function GlobalSettings({
    showSettings,
    setShowSettings,
}: GlobalSettingsProps) {
    const {
        globalCellSize,
        globalShowNumbers,
        globalShowPalette,
        globalTheme,
        globalExportPalette,
        globalGridType,
        setGlobalCellSize,
        toggleGlobalShowNumbers,
        toggleGlobalShowPalette,
        setGlobalTheme,
        toggleGlobalExportPalette,
        setGlobalGridType,
    } = useColorByNumberStore();

    const settingsRef = useRef<HTMLDivElement>(null);

    // Close settings dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setShowSettings]);

    const ToggleSwitch = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
        <div
            onClick={onToggle}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${on ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'}`}
        >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
    );

    return (
        <div className="relative" ref={settingsRef}>
            <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg border transition-colors ${showSettings
                    ? 'bg-(--accent)/20 border-(--accent) text-(--accent)'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                title="Global Settings"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50 p-5 space-y-5 max-h-[85vh] overflow-y-auto">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Global Settings
                    </h3>

                    {/* Cell Size */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs text-[var(--text-secondary)] font-medium">Cell Size</label>
                            <span className="text-xs text-[var(--text-primary)] font-mono bg-[var(--bg-primary)] px-2 py-0.5 rounded">{globalCellSize}px</span>
                        </div>
                        <input
                            type="range"
                            min={10}
                            max={100}
                            step={1}
                            value={globalCellSize}
                            onChange={(e) => setGlobalCellSize(Number(e.target.value))}
                            className="w-full"
                        />
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">Changing cell size will reset all completed projects</p>
                    </div>

                    <div className="border-t border-[var(--border-subtle)]" />

                    {/* Toggles */}
                    <div className="space-y-3">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">Show Numbers</span>
                            <ToggleSwitch on={globalShowNumbers} onToggle={toggleGlobalShowNumbers} />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">Show Palette</span>
                            <ToggleSwitch on={globalShowPalette} onToggle={toggleGlobalShowPalette} />
                        </label>

                        {/* Export Palette Toggle */}
                        <label className="flex items-center justify-between cursor-pointer group">
                            <div>
                                <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">Export Palette (per image)</span>
                                {globalExportPalette && (
                                    <p className="text-[10px] text-[var(--accent)] mt-0.5">Palette PNG added to zip</p>
                                )}
                            </div>
                            <ToggleSwitch on={globalExportPalette} onToggle={toggleGlobalExportPalette} />
                        </label>
                    </div>

                    <div className="border-t border-[var(--border-subtle)]" />

                    {/* Pattern Picker */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-secondary)] font-medium">Import Pattern</span>
                            {globalGridType !== 'auto' && (
                                <button
                                    onClick={() => setGlobalGridType('auto')}
                                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                    Reset to auto
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {GRID_TYPE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setGlobalGridType(opt.value)}
                                    className={`px-3 py-2 text-[10px] font-medium rounded-lg transition-all border ${globalGridType === opt.value
                                        ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-sm'
                                        : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-[var(--border-subtle)]" />

                    {/* Theme picker */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Theme</span>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {THEMES.map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setGlobalTheme(theme.id)}
                                    className={`px-3 py-2 text-[10px] font-medium rounded-lg transition-all flex items-center gap-2 border ${globalTheme === theme.id
                                        ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)] shadow-sm'
                                        : 'bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
                                        }`}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full border border-white/20"
                                        style={{ backgroundColor: theme.backgroundColor }}
                                    />
                                    {theme.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
