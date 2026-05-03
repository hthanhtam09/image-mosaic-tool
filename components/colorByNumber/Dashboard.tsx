"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import { getThemeById } from "@/lib/colorByNumber/themes";

import ProjectPreviewModal from "./ProjectPreviewModal";
import { generateBookPdf, parseCSV, PDFCsvRow } from "@/lib/colorByNumber/pdfExport";
import { exportToCanvas, exportPaletteToCanvas, exportCollagePagesToCanvas } from "@/lib/colorByNumber/export";

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
        globalShowPalette,
        globalTheme,
        globalShowNumbers,
        globalExportPalette,
        globalGridType,
        setGlobalTheme,
    } = useColorByNumberStore();

    const [showSettings, setShowSettings] = useState(false);

    const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
    // --- Wizard State ---
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // 1: Import, 2: Setup, 3: Preview, 4: Download

    // --- PDF Export Config State ---
    const [bgImages, setBgImages] = useState<string[]>([]);
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
    const paletteInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const transparentImageInputRef = useRef<HTMLInputElement>(null);
    const dirInputRef = useRef<HTMLInputElement>(null);
    const [directImages, setDirectImages] = useState<{ name: string; colorUrl: string; uncolorUrl: string; paletteUrl?: string }[]>([]);
    const [paletteImages, setPaletteImages] = useState<string[]>([]);
    const [uploadedFolders, setUploadedFolders] = useState<{ color: boolean, uncolor: boolean, palette: boolean }>({ color: false, uncolor: false, palette: false });
    const [showStoryInput, setShowStoryInput] = useState(true);
    const [isProcessingFolder, setIsProcessingFolder] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isPreparingStep2, setIsPreparingStep2] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [splitColorDropdownId, setSplitColorDropdownId] = useState<string | null>(null);
    const [keepImportScreen, setKeepImportScreen] = useState(false);
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
        setKeepImportScreen(false);
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

                // Pattern cycle (used when globalGridType is 'auto')
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

                    // Use global grid type if set, otherwise cycle
                    const pattern: ColorByNumberGridType = globalGridType === 'auto'
                        ? patternCycle[index % patternCycle.length]
                        : globalGridType;

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
        [addProject, globalGridType],
    );

    const handleImportTransparentClick = useCallback(() => {
        setKeepImportScreen(true);
        transparentImageInputRef.current?.click();
    }, []);

    const handleTransparentImageFileChange = useCallback(
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

                const newProjectIds: string[] = [];

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
                    const id = crypto.randomUUID();

                    // 1.5 Pad the image to protect edges
                    const paddedDataUrl = await padImageDataUrl(dataUrl, 130);

                    // Add project with assigned pattern and transparent background mode
                    const paddedFile = await dataUrlToFile(paddedDataUrl, file.name, file.type || "image/png");
                    addProject(paddedFile, paddedDataUrl, {
                        id,
                        gridType: pattern,
                        removeBackground: true,
                    });
                    newProjectIds.push(id);
                }

                if (newProjectIds.length > 0) {
                    // Keep user on import step and open preview in-place for Object Focus flow.
                    setCurrentStep(1);
                    setPreviewProjectId(newProjectIds[0]);
                    setIsConverting(true);
                    await convertAllIdleProjects();
                    setIsConverting(false);
                }

            } catch (err) {
                console.error("Failed to import transparent images:", err);
                setIsConverting(false);
            } finally {
                e.target.value = "";
            }
        },
        [addProject, convertAllIdleProjects],
    );

    const handleDirUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsProcessingFolder(true);

        try {
            let hasColor = false;
            let hasUncolor = false;
            let hasPalette = false;
            const groups: Record<string, { color?: File; uncolor?: File; palette?: File }> = {};

            for (const file of files) {
                const relPath = file.webkitRelativePath.toLowerCase();
                const name = file.name;

                if (!groups[name]) groups[name] = {};

                // Look for 'color', 'uncolor', or 'palette' anywhere in the path segments
                if (relPath.includes('/color/') || relPath.startsWith('color/')) {
                    groups[name].color = file;
                    hasColor = true;
                } else if (relPath.includes('/uncolor/') || relPath.startsWith('uncolor/')) {
                    groups[name].uncolor = file;
                    hasUncolor = true;
                } else if (relPath.includes('/palette/') || relPath.startsWith('palette/')) {
                    groups[name].palette = file;
                    hasPalette = true;
                } else if (relPath.includes('color') || relPath.includes('uncolor') || relPath.includes('palette')) { // fallback
                    const isColor = relPath.includes('color');
                    const isPalette = relPath.includes('palette');
                    groups[name][isPalette ? 'palette' : isColor ? 'color' : 'uncolor'] = file;
                    if (isPalette) hasPalette = true; else if (isColor) hasColor = true; else hasUncolor = true;
                }
            }

            // 2. Update status immediately
            setUploadedFolders(prev => ({
                color: prev.color || hasColor,
                uncolor: prev.uncolor || hasUncolor,
                palette: prev.palette || hasPalette
            }));

            const readFile = (f: File): Promise<string> => new Promise((resolve, reject) => {
                const rd = new FileReader();
                rd.onload = () => resolve(rd.result as string);
                rd.onerror = reject;
                rd.readAsDataURL(f);
            });

            const newDirectImages: { name: string; colorUrl: string; uncolorUrl: string; paletteUrl?: string }[] = [];
            for (const [name, g] of Object.entries(groups)) {
                // To move to Step 2, we need at least the uncolor image
                if (g.uncolor) {
                    newDirectImages.push({
                        name,
                        colorUrl: g.color ? await readFile(g.color) : '',
                        uncolorUrl: await readFile(g.uncolor),
                        paletteUrl: g.palette ? await readFile(g.palette) : undefined
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
            }
            setIsProcessingFolder(false);
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

    const handleBgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const dataUrls = await Promise.all(files.map(readFileAsDataURL));
        setBgImages(prev => [...prev, ...dataUrls]);
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

    const handlePaletteChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        if (files.length === 0) return;
        const dataUrls = await Promise.all(files.map(readFileAsDataURL));
        setPaletteImages(dataUrls);
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
            // ── Generate Solution Gallery Pages ──
            let solutionPages: string[] = [];
            const theme = getThemeById(globalTheme);

            if (directImages.length > 0) {
                // Folder Mode: Load colorUrl from directImages
                const colorCanvases = await Promise.all(directImages.map(async img => {
                    return new Promise<HTMLCanvasElement>((resolve) => {
                        const el = new Image();
                        el.onload = () => {
                            const canvas = document.createElement("canvas");
                            canvas.width = el.width;
                            canvas.height = el.height;
                            const ctx = canvas.getContext("2d");
                            ctx?.drawImage(el, 0, 0);
                            resolve(canvas);
                        };
                        el.src = img.colorUrl;
                    });
                }));
                const collagePages = exportCollagePagesToCanvas(colorCanvases, { bgColor: theme.backgroundColor });
                solutionPages = collagePages.map(c => c.toDataURL("image/png"));
            } else {
                // Standard Mode: Generate colored canvases from projects
                const colorCanvases = readyProjects.map(p => {
                    return exportToCanvas(p.data!, p.filled, {
                        showCodes: false,
                        colored: true,
                        showPalette: false,
                        partialColorMode: p.partialColorMode,
                        bgColor: theme.backgroundColor,
                        transparentBg: p.removeBackground,
                        tightCrop: p.removeBackground
                    });
                });
                const collagePages = exportCollagePagesToCanvas(colorCanvases, { bgColor: theme.backgroundColor });
                solutionPages = collagePages.map(c => c.toDataURL("image/png"));
            }

            const blob = await generateBookPdf(
                {
                    projects: readyProjects.map(p => ({
                        data: p.data!,
                        filled: p.filled,
                        partialColorMode: p.partialColorMode,
                        removeBackground: p.removeBackground
                    })),
                    directImages: directImages.map(img => ({
                        colorUrl: img.colorUrl,
                        uncolorUrl: img.uncolorUrl,
                        paletteUrl: img.paletteUrl
                    })),
                    backgroundImages: bgImages,
                    csvData,
                    prefixPages,
                    suffixPages,
                    solutionPages,
                    globalOptions: {
                        showCodes: globalShowNumbers,
                        showPalette: globalShowPalette,
                        theme: globalTheme,
                        showStoryInput: showStoryInput,
                        globalExportPalette: directImages.length > 0 ? directImages.some(img => !!img.paletteUrl) : globalExportPalette,
                        paletteImages: paletteImages
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
            .filter((p) => p.status === 'completed')
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        if (readyProjects.length === 0) return;

        setIsZipping(true);
        const zip = new JSZip();
        const rootFolder = zip.folder("converted_images");
        const colorFolder = rootFolder?.folder("color");
        const uncolorFolder = rootFolder?.folder("uncolor");
        const collageFolder = rootFolder?.folder("solutions_collage");
        const paletteFolder = globalExportPalette ? rootFolder?.folder("palette") : null;

        const coloredCanvases: HTMLCanvasElement[] = [];

        try {
            for (let i = 0; i < readyProjects.length; i++) {
                const project = readyProjects[i];
                const baseName = project.name.replace(/\.[^/.]+$/, "");
                const theme = getThemeById(globalTheme);

                // When exporting palette separately, hide the inline palette so the image is full-width
                const shouldShowPalette = project.removeBackground
                    ? false
                    : (globalExportPalette ? false : globalShowPalette);

                // Color version
                const canvasColor = exportToCanvas(project.data!, project.filled, {
                    showCodes: project.removeBackground ? false : globalShowNumbers,
                    colored: true,
                    showPalette: shouldShowPalette,
                    partialColorMode: project.partialColorMode,
                    bgColor: theme.backgroundColor,
                    transparentBg: project.removeBackground,
                    tightCrop: project.removeBackground,
                });
                coloredCanvases.push(canvasColor);
                const base64Color = canvasColor.toDataURL("image/png").split(',')[1];
                colorFolder?.file(`${baseName}.png`, base64Color, { base64: true });

                // Uncolored version (empty grid with numbers)
                const canvasUncolor = exportToCanvas(project.data!, project.filled, {
                    showCodes: !project.removeBackground,
                    colored: false,
                    showPalette: shouldShowPalette,
                    partialColorMode: project.partialColorMode,
                    bgColor: theme.backgroundColor,
                    transparentBg: project.removeBackground,
                    tightCrop: project.removeBackground,
                });
                const base64Uncolor = canvasUncolor.toDataURL("image/png").split(',')[1];
                uncolorFolder?.file(`${baseName}.png`, base64Uncolor, { base64: true });

                // Palette export (separate file) — vertical list, swatch right, name left, droplets themed
                if (globalExportPalette && paletteFolder && project.data) {
                    const canvasPalette = exportPaletteToCanvas(project.data, {
                        bgColor: theme.backgroundColor,
                        themeColor: theme.backgroundColor,
                        pageNumber: i + 1,
                    });
                    const base64Palette = canvasPalette.toDataURL("image/png").split(',')[1];
                    paletteFolder.file(`${baseName}.png`, base64Palette, { base64: true });
                }
            }

            // Generate Collage pages
            if (collageFolder && coloredCanvases.length > 0) {
                const theme = getThemeById(globalTheme);
                const collagePages = exportCollagePagesToCanvas(coloredCanvases, {
                    bgColor: theme.backgroundColor,
                });
                collagePages.forEach((pageCanvas, idx) => {
                    const base64Page = pageCanvas.toDataURL("image/png").split(',')[1];
                    collageFolder.file(`collage_page_${idx + 1}.png`, base64Page, { base64: true });
                });
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

        // Auto-fill palette images if Export Palette is enabled and we have converted projects (Standard Mode)
        if (globalExportPalette && projects.some(p => p.status === 'completed') && directImages.length === 0) {
            const readyProjects = [...projects]
                .filter(p => p.status === 'completed')
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            
            const theme = getThemeById(globalTheme);
            const generatedPalettes = readyProjects.map((project, idx) => {
                if (!project.data) return "";
                const canvas = exportPaletteToCanvas(project.data, {
                    bgColor: theme.backgroundColor,
                    themeColor: theme.backgroundColor,
                    pageNumber: idx + 1,
                    transparentBg: true
                });
                return canvas.toDataURL("image/png");
            }).filter(url => url !== "");
            
            setPaletteImages(generatedPalettes);
        }

        // Emulate brief loading for better UX
        await new Promise(resolve => setTimeout(resolve, 600));
        setCurrentStep(2);
        setIsPreparingStep2(false);
    };

/**
 * Pads a dataURL image with transparent pixels to ensure objects don't touch the edge.
 * This protects white objects from being accidentally eaten by the background remover.
 */
async function padImageDataUrl(dataUrl: string, padding: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width + padding * 2;
            canvas.height = img.height + padding * 2;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, padding, padding);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function dataUrlToFile(dataUrl: string, filename: string, mimeType: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: mimeType || blob.type || "image/png" });
}

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

    const isFolderModeActive = directImages.length > 0;
    const shouldShowImportScreen = keepImportScreen || 
                                   (projects.length === 0 && !isFolderModeActive) || 
                                   (isFolderModeActive && currentStep === 1);

    if (shouldShowImportScreen) {
        return (
            <>
                <EmptyState
                    handleImportClick={handleImportClick}
                    handleImportTransparentClick={handleImportTransparentClick}
                    dirInputRef={dirInputRef}
                    handleDirUploadChange={handleDirUploadChange}
                    isProcessingFolder={isProcessingFolder}
                    uploadedFolders={uploadedFolders}
                    imageInputRef={imageInputRef}
                    handleImageFileChange={handleImageFileChange}
                    transparentImageInputRef={transparentImageInputRef}
                    handleTransparentImageFileChange={handleTransparentImageFileChange}
                    handleNextToSetup={handleNextToSetup}
                    isPreparingStep2={isPreparingStep2}
                />
                {previewProjectId && (
                    <ProjectPreviewModal
                        projectId={previewProjectId}
                        onClose={() => setPreviewProjectId(null)}
                    />
                )}
            </>
        );
    }

    const idleCount = projects.filter(p => p.status === 'idle').length;

    return (
        <div className="h-full flex flex-col p-8 overflow-hidden">
            {/* Wizard Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-(--text-primary)">
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
                        className="px-4 py-2 text-sm font-medium text-(--text-primary) border border-(--border-default) rounded-lg hover:bg-white/5 transition-colors"
                    >
                        + Add More
                    </button>
                    {idleCount > 0 && (
                        <button
                            onClick={handleConvertAll}
                            disabled={isConverting}
                            className="px-6 py-2 text-sm font-medium text-(--bg-primary) bg-(--accent) hover:bg-(--accent-hover) rounded-lg shadow-sm transition-colors disabled:opacity-50"
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
                                    className="px-6 py-2 text-sm font-medium text-(--accent) border border-(--accent)/30 bg-(--accent)/5 hover:bg-(--accent)/10 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
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
                    bgImages={bgImages}
                    bgInputRef={bgInputRef}
                    handleBgChange={handleBgChange}
                    setBgImages={setBgImages}
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
                    showStoryInput={showStoryInput}
                    setShowStoryInput={setShowStoryInput}
                    globalExportPalette={globalExportPalette}
                    paletteImages={paletteImages}
                    setPaletteImages={setPaletteImages}
                    paletteInputRef={paletteInputRef}
                    handlePaletteChange={handlePaletteChange}
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
