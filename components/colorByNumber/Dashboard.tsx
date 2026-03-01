"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorByNumberGridType } from "@/lib/colorByNumber";
import type { PartialColorMode } from "@/lib/colorByNumber";
import ProjectPreviewModal from "./ProjectPreviewModal";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { exportToCanvas } from "@/lib/colorByNumber";

export default function Dashboard() {
    const {
        projects,
        addProject,
        convertAllIdleProjects,
        updateProject,
        removeProject,
        globalCellSize,
        globalShowNumbers,
        globalShowPalette,
        setGlobalCellSize,
        toggleGlobalShowNumbers,
        toggleGlobalShowPalette,
    } = useColorByNumberStore();

    const [showSettings, setShowSettings] = useState(false);
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
    }, []);

    const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [splitColorDropdownId, setSplitColorDropdownId] = useState<string | null>(null);
    const splitColorRef = useRef<HTMLDivElement>(null);

    // Close split color dropdown when clicking outside
    useEffect(() => {
        const handleClickOutsideSplit = (e: MouseEvent) => {
            if (splitColorRef.current && !splitColorRef.current.contains(e.target as Node)) {
                setSplitColorDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideSplit);
        return () => document.removeEventListener('mousedown', handleClickOutsideSplit);
    }, []);

    /* ── Import Image (Batch) ── */
    const handleImportClick = useCallback(() => {
        imageInputRef.current?.click();
    }, []);

    const handleImageFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            setIsImporting(true);

            try {
                // 1. Convert to array and Sort naturally (1, 2, 10...)
                const fileList = Array.from(files).sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                );

                // Pattern cycle: Square -> Circle -> Diamond -> Pentagon
                const patternCycle: ColorByNumberGridType[] = [
                    "standard",  // 1: Square
                    "honeycomb", // 2: Circle
                    "diamond",   // 3: Diamond
                    "pentagon"   // 4: Pentagon
                ];

                // Process sequentially to read files
                await Promise.all(fileList.map(async (file, index) => {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    // Calculate pattern based on index
                    const pattern = patternCycle[index % patternCycle.length];

                    // Add project with assigned pattern
                    addProject(file, dataUrl, {
                        gridType: pattern,
                    });
                }));

            } catch (err) {
                console.error("Failed to import images:", err);
            } finally {
                setIsImporting(false);
                e.target.value = "";
            }
        },
        [addProject],
    );

    /* ── Split Color Mode Options ── */
    const SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[] = [
        { value: 'none', label: 'Full Color', icon: '🟩' },
        { value: 'diagonal-bl-tr', label: 'Diagonal ↗', icon: '◣' },
        { value: 'diagonal-tl-br', label: 'Diagonal ↘', icon: '◤' },
        { value: 'horizontal-middle', label: 'Top Half', icon: '⬒' },
        { value: 'horizontal-sides', label: 'Bottom Half', icon: '⬓' },
    ];

    const handleConvertAll = async () => {
        setIsConverting(true);
        await convertAllIdleProjects();
        setIsConverting(false);
    };

    const handleDownloadAll = async () => {
        const completedProjects = projects.filter(p => p.status === 'completed');
        const zip = new JSZip();

        // Helper to get filename without extension
        const getBaseName = (name: string) => name.replace(/\.[^/.]+$/, "");

        try {
            await Promise.all(completedProjects.map(async (project) => {
                if (!project.data) return;

                // Use original file name's base, ensure .png extension
                const baseName = getBaseName(project.name);
                const fileName = `${baseName}.png`;

                const hasPalette = globalShowPalette;

                // 1. Colored
                const canvasColored = exportToCanvas(project.data, project.filled, {
                    showCodes: globalShowNumbers,
                    colored: true,
                    showPalette: globalShowPalette,
                    partialColorMode: project.partialColorMode,
                });

                const blobColored = await new Promise<Blob | null>(resolve => canvasColored.toBlob(resolve, 'image/png'));
                if (blobColored) {
                    if (hasPalette) {
                        zip.folder("colored")?.file(fileName, blobColored);
                    } else {
                        zip.file(fileName, blobColored);
                    }
                }

                if (hasPalette && project.partialColorMode === 'none') {
                    // 2. Uncolored (only for full color projects)
                    const canvasUncolored = exportToCanvas(project.data, project.filled, {
                        showCodes: globalShowNumbers,
                        colored: false,
                        showPalette: globalShowPalette,
                    });

                    const blobUncolored = await new Promise<Blob | null>(resolve => canvasUncolored.toBlob(resolve, 'image/png'));
                    if (blobUncolored) {
                        zip.folder("uncolored")?.file(fileName, blobUncolored);
                    }
                }
            }));

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "color-by-number-export.zip");

        } catch (error) {
            console.error("Failed to zip and download:", error);
            alert("Failed to generate zip file.");
        }
    };

    /* ── Download Color Palette Chart ── */
    const handleDownloadPalette = async () => {
        const completedProjects = projects.filter(p => p.status === 'completed');
        if (completedProjects.length === 0) return;

        // We use a Set to keep only ONE representative per exact hex color
        const uniqueColors = new Set<string>();

        for (const project of completedProjects) {
            if (!project.data) continue;
            for (const cell of project.data.cells) {
                const hex = cell.color.toLowerCase();
                
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                
                // Skip white / near-white
                if (brightness >= 250) continue;
                
                // Store exact unique hex
                uniqueColors.add(hex);
            }
        }

        const colors = Array.from(uniqueColors);
        const totalColors = colors.length;
        if (totalColors === 0) return;

        // --- 300 DPI letter page (8.5" × 11") ---
        const DPI = 300;
        const PAGE_W = Math.round(8.5 * DPI); // 2550
        const PAGE_H = Math.round(11 * DPI);  // 3300
        const MARGIN = Math.round(0.5 * DPI); // 0.5" margin = 150px

        const availW = PAGE_W - MARGIN * 2;
        const availH = PAGE_H - MARGIN * 2;

        // Auto-calculate columns and hexagon size to fit all colors
        const COLS = Math.min(10, totalColors);
        const ROWS = Math.ceil(totalColors / COLS);
        const GAP_RATIO = 0.3; // gap as fraction of radius

        // Max hex size that fits within available space
        // Pointy-topped hexagon: width = sqrt(3) * R, height = 2 * R
        const maxR_W = availW / (COLS * Math.sqrt(3) + (COLS - 1) * GAP_RATIO);
        const maxR_H = availH / (ROWS * 2 + (ROWS - 1) * GAP_RATIO);
        const HEX_RADIUS = Math.min(maxR_W, maxR_H) * 0.95;

        // Correct dimensions for pointy-topped hexagon
        const HEX_W = Math.sqrt(3) * HEX_RADIUS;
        const HEX_H = 2 * HEX_RADIUS;
        const GAP = Math.round(HEX_RADIUS * GAP_RATIO);
        const CELL_W = HEX_W + GAP;
        const CELL_H = HEX_H + GAP;

        // Center the grid on the page
        const gridW = COLS * CELL_W - GAP;
        const gridH = ROWS * CELL_H - GAP;
        const offsetX = (PAGE_W - gridW) / 2;
        const offsetY = (PAGE_H - gridH) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = PAGE_W;
        canvas.height = PAGE_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, PAGE_W, PAGE_H);

        // Helper: draw hexagon
        const drawHexagon = (cx: number, cy: number, r: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        };

        // Draw each color (hexagon only)
        colors.forEach((hex, idx) => {
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const cx = offsetX + col * CELL_W + HEX_W / 2;
            const cy = offsetY + row * CELL_H + HEX_H / 2;

            drawHexagon(cx, cy, HEX_RADIUS - 1);
            ctx.fillStyle = hex;
            ctx.fill();

            drawHexagon(cx, cy, HEX_RADIUS - 1);
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Download
        const link = document.createElement('a');
        link.download = `color-palette-${totalColors}-colors.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const GRID_TYPES: { value: ColorByNumberGridType; label: string }[] = [
        { value: "standard", label: "Hình vuông" },
        { value: "honeycomb", label: "Hình tròn" },
        { value: "diamond", label: "Hình thoi" },
        { value: "pentagon", label: "Ngũ giác" },
    ];

    // Logic: 
    // If no projects -> Show Big Central Import Button
    // If projects -> Show Grid of Cards + Top/Bottom Actions

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
                <div className="mb-6 p-6 bg-[var(--bg-secondary)] rounded-full">
                    <span className="text-6xl">📷</span>
                </div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Start Your Project</h2>
                <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                    Import images to create color-by-number templates. You can process multiple images at once.
                </p>
                <button
                    onClick={handleImportClick}
                    className="px-8 py-4 text-lg font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                    Import Images
                </button>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    multiple
                    onChange={handleImageFileChange}
                />
            </div>
        );
    }

    const idleCount = projects.filter(p => p.status === 'idle').length;

    return (
        <div className="h-full flex flex-col p-8 overflow-hidden">
            {/* Header / Actions */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                    Dashboard ({projects.length})
                </h1>
                <div className="flex gap-4 items-center">
                    {/* Settings Icon */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-lg border transition-colors ${
                                showSettings
                                    ? 'bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]'
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
                            <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl shadow-2xl z-50 p-5 space-y-5">
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
                                        <div
                                            onClick={toggleGlobalShowNumbers}
                                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                                                globalShowNumbers ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
                                            }`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                                globalShowNumbers ? 'translate-x-4' : 'translate-x-0.5'
                                            }`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">Show Palette</span>
                                        <div
                                            onClick={toggleGlobalShowPalette}
                                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                                                globalShowPalette ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
                                            }`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                                globalShowPalette ? 'translate-x-4' : 'translate-x-0.5'
                                            }`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleImportClick}
                        className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors"
                    >
                        + Add More
                    </button>
                    {idleCount > 0 && (
                        <button
                            onClick={handleConvertAll}
                            disabled={isConverting}
                            className="px-6 py-2 text-sm font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                        >
                            {isConverting ? "Converting..." : `Convert All (${idleCount})`}
                        </button>
                    )}
                    {projects.some(p => p.status === 'completed') && (
                        <>
                            <button
                                onClick={handleDownloadAll}
                                disabled={isConverting}
                                className="px-6 py-2 text-sm font-medium text-[var(--bg-primary)] bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isConverting ? "Processing..." : "Download All"}
                            </button>
                            <button
                                onClick={handleDownloadPalette}
                                disabled={isConverting}
                                className="px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download a chart of all colors used across all images"
                            >
                                🎨 Download Palette
                            </button>
                        </>
                    )}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        multiple
                        onChange={handleImageFileChange}
                    />
                </div>
            </div>

            {/* Grid of Project Cards */}
            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 pb-8">
                    {projects
                        .slice()
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                        .map(project => (
                            <div
                                key={project.id}
                                className="flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Image Preview / Status Overlay */}
                                <div className="relative w-full pt-[100%] bg-white/5 group border-b border-[var(--border-subtle)] overflow-hidden">
                                    <img
                                        src={project.thumbnailDataUrl}
                                        alt={project.name}
                                        className="absolute inset-0 w-full h-full object-cover object-top"
                                    />

                                    {/* Status Overlay */}
                                    {project.status === 'idle' && (
                                        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-yellow-500/80 text-white rounded backdrop-blur-sm">
                                            Pending
                                        </div>
                                    )}
                                    {project.status === 'processing' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                            <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {project.status === 'completed' && (
                                        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-green-500/80 text-white rounded backdrop-blur-sm">
                                            Ready
                                        </div>
                                    )}

                                    {/* Split Color Badge */}
                                    {project.partialColorMode !== 'none' && (
                                        <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-purple-500/80 text-white rounded backdrop-blur-sm">
                                            {SPLIT_COLOR_MODES.find(m => m.value === project.partialColorMode)?.icon} Split
                                        </div>
                                    )}

                                    {/* Hover Actions (Delete) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete this project?')) removeProject(project.id);
                                        }}
                                        className="absolute top-2 left-2 p-1.5 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded hover:bg-red-500/80 transition-all"
                                        title="Delete"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Controls */}
                                <div className="p-4 space-y-4">
                                    <div>
                                        <h3 className="text-sm font-medium text-[var(--text-primary)] truncate" title={project.name}>
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                            {project.status === 'completed' ? `${project.data?.cells.length} cells` : 'Not processed'}
                                        </p>
                                    </div>

                                    {/* Settings (Only if not processing) */}
                                    <div className="space-y-3">
                                        {/* Pattern Type */}
                                        <div>
                                            <label className="text-xs text-[var(--text-secondary)] block mb-1">Pattern Type</label>
                                            <select
                                                value={project.gridType}
                                                onChange={(e) => updateProject(project.id, { gridType: e.target.value as ColorByNumberGridType, status: 'idle' })}
                                                disabled={project.status === 'processing'}
                                                className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                            >
                                                {GRID_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Split Color Mode */}
                                        <div className="relative" ref={splitColorDropdownId === project.id ? splitColorRef : undefined}>
                                            <label className="text-xs text-[var(--text-secondary)] block mb-1">Split Color</label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={project.partialColorMode}
                                                    onChange={(e) => updateProject(project.id, { partialColorMode: e.target.value as PartialColorMode, status: 'idle' })}
                                                    disabled={project.status === 'processing'}
                                                    className="flex-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                                >
                                                    {SPLIT_COLOR_MODES.map(m => (
                                                        <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    {project.status === 'completed' ? (
                                        <button
                                            onClick={() => setPreviewProjectId(project.id)}
                                            className="w-full py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 rounded-lg transition-colors border border-[var(--accent)]/20"
                                        >
                                            Open Preview
                                        </button>
                                    ) : (
                                        <div className="h-9"></div> // Spacer to align cards
                                    )}
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {previewProjectId && (
                <ProjectPreviewModal
                    projectId={previewProjectId}
                    onClose={() => setPreviewProjectId(null)}
                />
            )}
        </div>
    );
}
