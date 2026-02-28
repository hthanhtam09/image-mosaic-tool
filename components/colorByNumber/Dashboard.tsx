"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useRef, useState } from "react";
import type { ColorByNumberGridType } from "@/lib/colorByNumber";
import ProjectPreviewModal from "./ProjectPreviewModal";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { exportToCanvas } from "@/lib/colorByNumber";
import { rgbToExtendedColorName } from "@/lib/utils";

export default function Dashboard() {
    const {
        projects,
        addProject,
        convertAllIdleProjects,
        updateProject,
        removeProject,
        setCellSize,
        toggleShowNumbers,
        togglePalette,
    } = useColorByNumberStore();

    const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isConverting, setIsConverting] = useState(false);

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

                const hasPalette = project.showPalette !== false;

                // 1. Colored
                const canvasColored = exportToCanvas(project.data, project.filled, {
                    showCodes: project.showNumbers,
                    colored: true,
                    showPalette: project.showPalette ?? true,
                });

                const blobColored = await new Promise<Blob | null>(resolve => canvasColored.toBlob(resolve, 'image/png'));
                if (blobColored) {
                    if (hasPalette) {
                        zip.folder("colored")?.file(fileName, blobColored);
                    } else {
                        zip.file(fileName, blobColored);
                    }
                }

                if (hasPalette) {
                    // 2. Uncolored
                    const canvasUncolored = exportToCanvas(project.data, project.filled, {
                        showCodes: project.showNumbers,
                        colored: false,
                        showPalette: project.showPalette ?? true,
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
    const handleDownloadPalette = () => {
        const completedProjects = projects.filter(p => p.status === 'completed');
        if (completedProjects.length === 0) return;

        // Step 1: Collect all unique hex colors from all completed projects
        const allHexColors = new Set<string>();
        for (const project of completedProjects) {
            if (!project.data) continue;
            for (const cell of project.data.cells) {
                allHexColors.add(cell.color.toLowerCase());
            }
        }

        // Step 2: Name each hex using the extended 70+ color palette, then deduplicate by name
        // This ensures each color name appears only ONCE in the chart
        const nameToColor = new Map<string, { hex: string; name: string }>();

        for (const hex of allHexColors) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);

            const match = rgbToExtendedColorName({ r, g, b });

            // Skip white / ivory / cream (near-white colors)
            const skipNames = ['white', 'ivory', 'cream'];
            if (skipNames.includes(match.name.toLowerCase())) continue;

            // Deduplicate by name: keep the first hex encountered for each name
            if (!nameToColor.has(match.name)) {
                // Use the canonical RGB from the extended palette for consistent display
                const canonicalHex = `#${match.rgb.r.toString(16).padStart(2, '0')}${match.rgb.g.toString(16).padStart(2, '0')}${match.rgb.b.toString(16).padStart(2, '0')}`;
                nameToColor.set(match.name, { hex: canonicalHex, name: match.name });
            }
        }

        const colors = Array.from(nameToColor.values());
        const totalColors = colors.length;
        if (totalColors === 0) return;

        // --- Canvas rendering (hexagon palette chart) ---
        const COLS = Math.min(10, totalColors);
        const HEX_RADIUS = 28; // radius of each hexagon
        const HEX_W = HEX_RADIUS * 2;
        const HEX_H = Math.sqrt(3) * HEX_RADIUS;
        const GAP_X = 8;
        const GAP_Y = 6;
        const LABEL_HEIGHT = 32; // space for text below hexagon
        const CELL_W = HEX_W + GAP_X;
        const CELL_H = HEX_H + LABEL_HEIGHT + GAP_Y;
        const ROWS = Math.ceil(totalColors / COLS);
        const PADDING_X = 30;
        const PADDING_TOP = 60; // space for title
        const PADDING_BOTTOM = 20;

        const canvasW = COLS * CELL_W + PADDING_X * 2;
        const canvasH = PADDING_TOP + ROWS * CELL_H + PADDING_BOTTOM;

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Title: total number of colors
        ctx.fillStyle = '#222222';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${totalColors} COLORS`, canvasW / 2, PADDING_TOP / 2);

        // Draw a thin line under the title
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PADDING_X, PADDING_TOP - 10);
        ctx.lineTo(canvasW - PADDING_X, PADDING_TOP - 10);
        ctx.stroke();

        // Helper: draw hexagon
        const drawHexagon = (cx: number, cy: number, r: number) => {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - Math.PI / 6; // flat-top hexagon
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        };

        // Draw each color
        colors.forEach((color, idx) => {
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const cx = PADDING_X + col * CELL_W + HEX_W / 2;
            const cy = PADDING_TOP + row * CELL_H + HEX_H / 2;

            // Hexagon fill
            drawHexagon(cx, cy, HEX_RADIUS - 1);
            ctx.fillStyle = color.hex;
            ctx.fill();

            // Hexagon border
            drawHexagon(cx, cy, HEX_RADIUS - 1);
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Color name below hexagon (wrap text if needed)
            ctx.fillStyle = '#333333';
            ctx.font = '11px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textY = cy + HEX_H / 2 + 4;
            const maxTextW = CELL_W - 4;
            const words = color.name.split(' ');
            if (words.length > 1 && ctx.measureText(color.name).width > maxTextW) {
                // Two-line text
                ctx.fillText(words[0], cx, textY);
                ctx.fillText(words.slice(1).join(' '), cx, textY + 13);
            } else {
                ctx.fillText(color.name, cx, textY);
            }
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
                <div className="flex gap-4">
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

                                        {/* Cell Size Slider */}
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-xs text-[var(--text-secondary)]">Cell Size</label>
                                                <span className="text-xs text-[var(--text-primary)] font-mono">{project.cellSize}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={10}
                                                max={100}
                                                step={1}
                                                value={project.cellSize}
                                                onChange={(e) => setCellSize(project.id, Number(e.target.value))}
                                                disabled={project.status === 'processing'}
                                                className="w-full"
                                            />
                                        </div>

                                        {/* Toggles */}
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={project.showNumbers}
                                                    onChange={() => toggleShowNumbers(project.id)}
                                                    className="rounded border-[var(--border-default)] bg-transparent text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                                                />
                                                <span className="text-xs text-[var(--text-secondary)] select-none">Numbers</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={project.showPalette ?? true}
                                                    onChange={() => togglePalette(project.id)}
                                                    className="rounded border-[var(--border-default)] bg-transparent text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                                                />
                                                <span className="text-xs text-[var(--text-secondary)] select-none">Palette</span>
                                            </label>
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
