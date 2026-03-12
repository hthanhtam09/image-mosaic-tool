"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import ProjectPreviewModal from "./ProjectPreviewModal";
import { generateBookPdf, parseCSV, PDFCsvRow } from "@/lib/colorByNumber/pdfExport";

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
        globalTheme,
        setGlobalCellSize,
        toggleGlobalShowNumbers,
        toggleGlobalShowPalette,
        setGlobalTheme,
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

    // --- Wizard State ---
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // 1: Import, 2: Setup, 3: Preview, 4: Download

    // --- PDF Export Config State ---
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [csvData, setCsvData] = useState<PDFCsvRow[]>([]);
    const [csvFileName, setCsvFileName] = useState<string>("");
    const [prefixPages, setPrefixPages] = useState<string[]>([]);
    const [suffixPages, setSuffixPages] = useState<string[]>([]);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });

    const bgInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);
    const prefixInputRef = useRef<HTMLInputElement>(null);
    const suffixInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
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

            try {
                // 1. Convert to array and Sort naturally (1, 2, 10...)
                const fileList = Array.from(files).sort((a, b) =>
                    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
                );
                // Pattern cycle: Square -> Circle -> Diamond -> Pentagon -> Puzzle -> Islamic -> Fish Scale -> Trapezoid
                const patternCycle: ColorByNumberGridType[] = [
                    "standard",
                    "honeycomb",
                    "diamond",
                    "pentagon",
                    "puzzle",
                    "islamic",
                    "fish-scale",
                    "trapezoid",
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
    };    // --- PDF Setup Handlers ---
    const readFileAsDataURL = (file: File): Promise<string> =>
        new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });

    const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setBgImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handlePrefixChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const dataUrls = await Promise.all(files.map(readFileAsDataURL));
        setPrefixPages(dataUrls);
    };

    const handleSuffixChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const dataUrls = await Promise.all(files.map(readFileAsDataURL));
        setSuffixPages(dataUrls);
    };

    const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFileName(file.name);
        const text = await file.text();
        setCsvData(parseCSV(text));
    };

    const handleGeneratePdf = async () => {
        const readyProjects = projects.filter(p => p.status === 'completed');
        if (readyProjects.length === 0) return;

        setCurrentStep(3);
        setIsGeneratingPdf(true);
        setPdfProgress({ current: 0, total: 100 });

        // Yield to allow React to render the loading screen before blocking the thread
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const blob = await generateBookPdf(
                {
                    projects: readyProjects.map(p => ({
                        data: p.data!,
                        filled: p.filled,
                        partialColorMode: p.partialColorMode
                    })),
                    backgroundImage: bgImage,
                    csvData,
                    prefixPages,
                    suffixPages,
                    globalOptions: { theme: globalTheme } as any
                },
                (current: number, total: number) => {
                    setPdfProgress({ current, total });
                }
            );

            // Automatically download the blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "ColorByNumber_Book.pdf";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Check console for details.");
            setCurrentStep(2); // go back to setup on failure
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    const GRID_TYPES: { value: ColorByNumberGridType; label: string }[] = [
        { value: "standard", label: "Square" },
        { value: "honeycomb", label: "Circle" },
        { value: "diamond", label: "Diamond" },
        { value: "pentagon", label: "Hexagon" },
        { value: "puzzle", label: "Puzzle" },
        { value: "islamic", label: "Islamic" },
        { value: "fish-scale", label: "Fish Scale" },
        { value: "trapezoid", label: "Trapezoid" },
    ];

    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
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
            {/* Wizard Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        PDF Book Generator
                    </h1>
                </div>
                <div className="flex gap-4 items-center">
                    {/* Settings Icon */}
                    <div className="relative" ref={settingsRef}>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-lg border transition-colors ${showSettings
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
                                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${globalShowNumbers ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
                                                }`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${globalShowNumbers ? 'translate-x-4' : 'translate-x-0.5'
                                                }`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">Show Palette</span>
                                        <div
                                            onClick={toggleGlobalShowPalette}
                                            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${globalShowPalette ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'
                                                }`}
                                        >
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${globalShowPalette ? 'translate-x-4' : 'translate-x-0.5'
                                                }`} />
                                        </div>
                                    </label>

                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                                        <span className="text-xs text-[var(--text-secondary)] font-medium">Theme</span>
                                        <div className="flex items-center gap-1 bg-[var(--bg-primary)] p-1 border border-[var(--border-default)] rounded-lg">
                                            <button
                                                onClick={() => setGlobalTheme('light')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${globalTheme === 'light'
                                                    ? 'bg-white text-black shadow-sm'
                                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                                    }`}
                                            >
                                                Light
                                            </button>
                                            <button
                                                onClick={() => setGlobalTheme('dark')}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${globalTheme === 'dark'
                                                    ? 'bg-zinc-800 text-white shadow-sm'
                                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                                                    }`}
                                            >
                                                Dark
                                            </button>
                                        </div>
                                    </div>
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
                    {currentStep === 1 && projects.length > 0 && idleCount === 0 && (
                        <button
                            onClick={() => setCurrentStep(2)}
                            disabled={isConverting}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            Next: Setup PDF
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
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

            {/* Wizard Step 1: Grid of Project Cards */}
            {currentStep === 1 && (
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
            )}

            {/* Wizard Step 2: Setup PDF */}
            {currentStep === 2 && (
                <div className="flex-1 flex flex-col py-2 overflow-y-auto no-scrollbar">
                    <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                        {/* 1. Intro Pages */}
                        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Intro Pages</h3>
                                <p className="text-xs text-[var(--text-secondary)] text-center mb-5">Front matter, copyright, instructions (Pages 1-5)</p>

                                {prefixPages.length > 0 ? (
                                    <div className="flex flex-col items-center w-full gap-3">
                                        <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                            {prefixPages.map((page, i) => (
                                                <div key={i} className="flex-shrink-0 relative w-12 h-16 rounded border border-[var(--border-default)] overflow-hidden shadow-sm">
                                                    <img src={page} alt={`Intro ${i + 1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setPrefixPages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                            <button onClick={() => prefixInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors">Add More</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => prefixInputRef.current?.click()} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Select Images</button>
                                )}
                                <input ref={prefixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePrefixChange} />
                            </div>
                            {prefixPages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({prefixPages.length})</div>}
                        </div>

                        {/* 2. Background Image */}
                        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {bgImage && (
                                <div className="absolute inset-0 opacity-10 blur-sm">
                                    <img src={bgImage} alt="bg" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Background Theme</h3>
                                <p className="text-xs text-[var(--text-secondary)] text-center mb-5">Design applied to all left-side pages</p>

                                {bgImage ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="relative w-24 h-32 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                                            <img src={bgImage} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setBgImage(null)} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Remove</button>
                                            <button onClick={() => bgInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-black/5 rounded-lg transition-colors">Change</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => bgInputRef.current?.click()} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Upload Image</button>
                                )}
                                <input ref={bgInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleBgChange} />
                            </div>
                            {bgImage && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded</div>}
                            {!bgImage && <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Optional</div>}
                        </div>

                        {/* 3. CSV Text Content */}
                        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Story Content</h3>
                                <p className="text-xs text-[var(--text-secondary)] text-center mb-5">Fun facts and text blocks via CSV</p>

                                {csvFileName && csvData.length > 0 ? (
                                    <div className="flex flex-col items-center gap-4 w-full">
                                        <div className="w-full max-w-[200px] bg-[var(--bg-primary)] rounded border border-[var(--border-default)] overflow-hidden">
                                            <div className="bg-black/5 px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] border-b border-[var(--border-default)] flex justify-between">
                                                <span>#</span><span>Text Preview</span>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                {csvData.slice(0, 3).map((r, i) => (
                                                    <div key={i} className="flex gap-2 text-xs">
                                                        <span className="text-[var(--text-secondary)] w-4 shrink-0 font-mono">{r.number}</span>
                                                        <span className="text-[var(--text-primary)] truncate">{r.text}</span>
                                                    </div>
                                                ))}
                                                {csvData.length > 3 && (
                                                    <div className="text-[10px] text-center text-[var(--text-secondary)] pt-1 border-t border-[var(--border-default)]">+{csvData.length - 3} more rows</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setCsvFileName(""); setCsvData([]); }} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                            <button onClick={() => csvInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors">Change CSV</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => csvInputRef.current?.click()} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Upload CSV File</button>
                                )}
                                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
                            </div>
                            {csvFileName && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({csvData.length})</div>}
                        </div>

                        {/* 4. Outro Pages */}
                        <div className="bg-[var(--bg-secondary)] rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                                <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                </div>
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Outro Pages</h3>
                                <p className="text-xs text-[var(--text-secondary)] text-center mb-5">Answer keys, cross-promotion, back cover</p>

                                {suffixPages.length > 0 ? (
                                    <div className="flex flex-col items-center w-full gap-3">
                                        <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                            {suffixPages.map((page, i) => (
                                                <div key={i} className="flex-shrink-0 relative w-12 h-16 rounded border border-[var(--border-default)] overflow-hidden shadow-sm">
                                                    <img src={page} alt={`Outro ${i + 1}`} className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setSuffixPages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                            <button onClick={() => suffixInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors">Add More</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => suffixInputRef.current?.click()} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Select Images</button>
                                )}
                                <input ref={suffixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSuffixChange} />
                            </div>
                            {suffixPages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({suffixPages.length})</div>}
                            {suffixPages.length === 0 && <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Optional</div>}
                        </div>
                    </div>

                    {/* Step 2 Actions */}
                    <div className="flex items-center justify-between mt-6 max-w-5xl mx-auto w-full pt-4 border-t border-[var(--border-subtle)]">
                        <button
                            onClick={() => setCurrentStep(1)}
                            className="px-6 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Back to Grid
                        </button>
                        <button
                            onClick={handleGeneratePdf}
                            className="px-6 py-2 text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            Generate & Download PDF
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Wizard Step 3: Generation & Download */}
            {currentStep === 3 && (
                <div className="flex-1 flex flex-col py-2 items-center justify-center bg-[var(--bg-primary)] z-50">
                    <div className="w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">

                        {/* Connecting background lines */}
                        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                        <div className="relative z-10 flex flex-col items-center w-full">
                            {!isGeneratingPdf && pdfProgress.current === pdfProgress.total && pdfProgress.total !== 0 ? (
                                <>
                                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center">Export Complete!</h2>
                                    <p className="text-[var(--text-secondary)] text-center mb-8">Your KDP-ready PDF has been generated and downloaded.</p>
                                </>
                            ) : (
                                <>
                                    <div className="relative w-24 h-24 mb-6">
                                        <svg className="w-full h-full text-[var(--border-default)]" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" />
                                        </svg>
                                        <svg className="w-full h-full absolute inset-0 text-[var(--accent)] drop-shadow-md origin-center -rotate-90 transition-all duration-300" viewBox="0 0 100 100">
                                            <circle
                                                cx="50"
                                                cy="50"
                                                r="45"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="8"
                                                strokeDasharray="283"
                                                strokeDashoffset={283 - (283 * (pdfProgress.total ? pdfProgress.current / pdfProgress.total : 0))}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-[var(--text-primary)]">
                                            {pdfProgress.total ? Math.round((pdfProgress.current / pdfProgress.total) * 100) : 0}%
                                        </div>
                                    </div>

                                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2 text-center">Generating Book...</h2>
                                    <p className="text-[var(--text-secondary)] text-center text-sm mb-6">Processing high-quality vectors. This may take a moment.</p>

                                    <div className="w-full max-w-sm flex justify-between text-xs text-[var(--text-secondary)] mb-2 font-mono">
                                        <span>Page {pdfProgress.current}</span>
                                        <span>Total {pdfProgress.total}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {previewProjectId && (
                <ProjectPreviewModal
                    projectId={previewProjectId}
                    onClose={() => setPreviewProjectId(null)}
                />
            )}
        </div>
    );
}
