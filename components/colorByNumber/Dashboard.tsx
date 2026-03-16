"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import { getThemeById } from "@/lib/colorByNumber/themes";

import ProjectPreviewModal from "./ProjectPreviewModal";
import { generateBookPdf, parseCSV, PDFCsvRow } from "@/lib/colorByNumber/pdfExport";
import { exportToCanvas } from "@/lib/colorByNumber/export";

import JSZip from "jszip";
import { saveAs } from "file-saver";

// Sub-components
import GlobalSettings from "./dashboard/GlobalSettings";
import EmptyState from "./dashboard/EmptyState";
import ProjectGrid from "./dashboard/ProjectGrid";
import PdfSetupStep from "./dashboard/PdfSetupStep";
import PdfProgressStep from "./dashboard/PdfProgressStep";

export default function Dashboard() {
    const {
        projects,
        addProject,
        convertAllIdleProjects,
        globalShowNumbers,
        globalShowPalette,
        globalTheme,
        setGlobalTheme,
    } = useColorByNumberStore();

    const [showSettings, setShowSettings] = useState(false);

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
    const dirInputRef = useRef<HTMLInputElement>(null);
    const [directImages, setDirectImages] = useState<{ name: string; colorUrl: string; uncolorUrl: string }[]>([]);
    const [uploadedFolders, setUploadedFolders] = useState<{ color: boolean, uncolor: boolean }>({ color: false, uncolor: false });
    const [isProcessingFolder, setIsProcessingFolder] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isPreparingStep2, setIsPreparingStep2] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
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

                // Process sequentially to preserve order
                for (let index = 0; index < fileList.length; index++) {
                    const file = fileList[index];
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
                }

            } catch (err) {
                console.error("Failed to import images:", err);
            } finally {
                e.target.value = "";
            }
        },
        [addProject],
    );

    const handleDirUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsProcessingFolder(true);

        try {
            // 1. Better detection logic
            let hasColor = false;
            let hasUncolor = false;
            const groups: Record<string, { color?: File; uncolor?: File }> = {};

            for (const file of files) {
                const relPath = file.webkitRelativePath.toLowerCase();
                const name = file.name;

                if (!groups[name]) groups[name] = {};

                // Look for 'color' or 'uncolor' anywhere in the path segments
                if (relPath.includes('/color/') || relPath.startsWith('color/')) {
                    groups[name].color = file;
                    hasColor = true;
                } else if (relPath.includes('/uncolor/') || relPath.startsWith('uncolor/')) {
                    groups[name].uncolor = file;
                    hasUncolor = true;
                } else if (relPath.includes('color') || relPath.includes('uncolor')) { // fallback
                    const isColor = relPath.includes('color');
                    groups[name][isColor ? 'color' : 'uncolor'] = file;
                    if (isColor) hasColor = true; else hasUncolor = true;
                }
            }

            // 2. Update status immediately
            setUploadedFolders(prev => ({
                color: prev.color || hasColor,
                uncolor: prev.uncolor || hasUncolor
            }));

            const readFile = (f: File): Promise<string> => new Promise((resolve, reject) => {
                const rd = new FileReader();
                rd.onload = () => resolve(rd.result as string);
                rd.onerror = reject;
                rd.readAsDataURL(f);
            });

            const newDirectImages: { name: string; colorUrl: string; uncolorUrl: string }[] = [];
            for (const [name, g] of Object.entries(groups)) {
                // To move to Step 2, we need at least the uncolor image
                if (g.uncolor) {
                    newDirectImages.push({
                        name,
                        colorUrl: g.color ? await readFile(g.color) : '',
                        uncolorUrl: await readFile(g.uncolor)
                    });
                }
            }

            if (newDirectImages.length > 0) {
                setDirectImages(prev => {
                    // Filter out existing matches to avoid duplicates if re-uploading
                    const filtered = prev.filter(p => !newDirectImages.some(n => n.name === p.name));
                    const updated = [...filtered, ...newDirectImages];
                    return updated.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                });

                // Small delay to show the "Light Up" effect before transitioning
                setTimeout(() => {
                    setCurrentStep(2);
                    setIsProcessingFolder(false);
                }, 1000);
            } else {
                setIsProcessingFolder(false);
            }
        } catch (err) {
            console.error("Folder upload failed:", err);
            setIsProcessingFolder(false);
        }

        e.target.value = '';
    };

    const removeDirectImage = (name: string) => {
        setDirectImages(prev => prev.filter(img => img.name !== name));
    };

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
        const readyProjects = [...projects]
            .filter((p) => p.status === "completed")
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        if (readyProjects.length === 0 && directImages.length === 0) return;

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
                    directImages: directImages.map(img => ({
                        colorUrl: img.colorUrl,
                        uncolorUrl: img.uncolorUrl
                    })),
                    backgroundImage: bgImage,
                    csvData,
                    prefixPages,
                    suffixPages,
                    globalOptions: {
                        showCodes: globalShowNumbers,
                        showPalette: globalShowPalette,
                        theme: globalTheme
                    },
                },
                (current: number, total: number) => {
                    setPdfProgress({ current, total });
                }
            );

            // Automatically download the blob
            const url = globalThis.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = "ColorByNumber_Book.pdf";
            document.body.appendChild(a);
            a.click();
            globalThis.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Check console for details.");
            setCurrentStep(2); // go back to setup on failure
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadAllImages = async () => {
        const readyProjects = [...projects]
            .filter((p) => p.status === "completed")
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        if (readyProjects.length === 0) return;

        setIsZipping(true);
        const zip = new JSZip();
        const rootFolder = zip.folder("converted_images");
        const colorFolder = rootFolder?.folder("color");
        const uncolorFolder = rootFolder?.folder("uncolor");

        try {
            for (const element of readyProjects) {
                const project = element;
                const baseName = project.name.replace(/\.[^/.]+$/, "");

                // Color version
                const theme = getThemeById(globalTheme);
                const canvasColor = exportToCanvas(project.data!, project.filled, {
                    showCodes: globalShowNumbers,
                    colored: true,
                    showPalette: globalShowPalette,
                    partialColorMode: project.partialColorMode,
                    bgColor: theme.backgroundColor,
                });
                const dataUrlColor = canvasColor.toDataURL("image/png");
                const base64Color = dataUrlColor.split(',')[1];
                colorFolder?.file(`${baseName}.png`, base64Color, { base64: true });

                // Uncolored version (empty grid with numbers)
                const canvasUncolor = exportToCanvas(project.data!, project.filled, {
                    showCodes: true, // Always show codes for uncolored version
                    colored: false,  // Uncolored
                    showPalette: globalShowPalette,
                    partialColorMode: project.partialColorMode,
                    bgColor: theme.backgroundColor,
                });
                const dataUrlUncolor = canvasUncolor.toDataURL("image/png");
                const base64Uncolor = dataUrlUncolor.split(',')[1];
                uncolorFolder?.file(`${baseName}.png`, base64Uncolor, { base64: true });
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "converted_images.zip");
        } catch (error) {
            console.error("Failed to ZIP images:", error);
        } finally {
            setIsZipping(false);
        }
    };

    const handleNextToSetup = async () => {
        setIsPreparingStep2(true);
        // Emulate brief loading for better UX
        await new Promise(resolve => setTimeout(resolve, 600));
        setCurrentStep(2);
        setIsPreparingStep2(false);
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

    if (projects.length === 0 && directImages.length === 0) {
        return (
            <EmptyState
                handleImportClick={handleImportClick}
                dirInputRef={dirInputRef}
                handleDirUploadChange={handleDirUploadChange}
                isProcessingFolder={isProcessingFolder}
                uploadedFolders={uploadedFolders}
                imageInputRef={imageInputRef}
                handleImageFileChange={handleImageFileChange}
            />
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
                    <GlobalSettings
                        showSettings={showSettings}
                        setShowSettings={setShowSettings}
                    />

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
                    {currentStep === 1 && (projects.length > 0 || directImages.length > 0) && idleCount === 0 && (
                        <div className="flex gap-3">
                            {projects.length > 0 && (
                                <button
                                    onClick={handleDownloadAllImages}
                                    disabled={isZipping}
                                    className="px-6 py-2 text-sm font-medium text-[var(--accent)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 hover:bg-[var(--accent)]/10 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    {isZipping ? (
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    )}
                                    Download All (.zip)
                                </button>
                            )}
                            <button
                                onClick={handleNextToSetup}
                                disabled={isConverting || isPreparingStep2}
                                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[160px]"
                            >
                                {isPreparingStep2 ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Next: Setup PDF
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
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
                <ProjectGrid
                    projects={projects}
                    directImages={directImages}
                    removeDirectImage={removeDirectImage}
                    splitColorDropdownId={splitColorDropdownId}
                    setSplitColorDropdownId={setSplitColorDropdownId}
                    splitColorRef={splitColorRef}
                    setPreviewProjectId={setPreviewProjectId}
                    SPLIT_COLOR_MODES={SPLIT_COLOR_MODES}
                    GRID_TYPES={GRID_TYPES}
                />
            )}

            {/* Wizard Step 2: Setup PDF */}
            {currentStep === 2 && (
                <PdfSetupStep
                    directImages={directImages}
                    uploadedFolders={uploadedFolders}
                    prefixPages={prefixPages}
                    prefixInputRef={prefixInputRef}
                    handlePrefixChange={handlePrefixChange}
                    setPrefixPages={setPrefixPages}
                    bgImage={bgImage}
                    bgInputRef={bgInputRef}
                    handleBgChange={handleBgChange}
                    setBgImage={setBgImage}
                    csvFileName={csvFileName}
                    csvData={csvData}
                    csvInputRef={csvInputRef}
                    handleCsvChange={handleCsvChange}
                    setCsvFileName={setCsvFileName}
                    setCsvData={setCsvData}
                    suffixPages={suffixPages}
                    suffixInputRef={suffixInputRef}
                    handleSuffixChange={handleSuffixChange}
                    setSuffixPages={setSuffixPages}
                    globalTheme={globalTheme}
                    setGlobalTheme={setGlobalTheme}
                    setCurrentStep={setCurrentStep}
                    setDirectImages={setDirectImages}
                    setUploadedFolders={setUploadedFolders}
                    handleGeneratePdf={handleGeneratePdf}
                />
            )}

            {/* Wizard Step 3: Generation & Download */}
            {currentStep === 3 && (
                <PdfProgressStep
                    isGeneratingPdf={isGeneratingPdf}
                    pdfProgress={pdfProgress}
                    setCurrentStep={setCurrentStep}
                    setDirectImages={setDirectImages}
                    setUploadedFolders={setUploadedFolders}
                />
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
