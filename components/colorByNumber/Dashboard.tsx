"use client";

import {
  useColorByNumberStore,
  type Project,
} from "@/store/useColorByNumberStore";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ColorByNumberGridType,
  PartialColorMode,
} from "@/lib/colorByNumber";
import { getThemeById } from "@/lib/colorByNumber/themes";

import ProjectPreviewModal from "./ProjectPreviewModal";
import {
  generateBookPdf,
  parseCSV,
  PDFCsvRow,
} from "@/lib/colorByNumber/pdfExport";
import {
  exportToCanvas,
  exportPaletteToCanvas,
  exportCollagePagesToCanvas,
  exportDotCodeMagnifierToCanvas,
} from "@/lib/colorByNumber/export";
import {
  canvasToDpiPngBase64,
  canvasToDpiPngBlob,
} from "@/lib/colorByNumber/pngDpi";
import {
  exportBeforeAfterToCanvas,
  type BeforeAfterTheme,
} from "@/lib/colorByNumber/beforeAfter";
import { imageToColorByNumber } from "@/lib/colorByNumber/imageToColorByNumber";
import {
  shouldShowCodes,
  shouldUseTightCrop,
} from "@/lib/colorByNumber/objectFocus";

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
    globalCellSize,
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
  const solutionCollageInputRef = useRef<HTMLInputElement>(null);
  const solutionNamesInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const transparentImageInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const beforeAfterInputRef = useRef<HTMLInputElement>(null);
  const [directImages, setDirectImages] = useState<
    {
      name: string;
      colorUrl: string;
      uncolorUrl: string;
      paletteUrl?: string;
    }[]
  >([]);
  const [paletteImages, setPaletteImages] = useState<string[]>([]);
  const [solutionCollagePages, setSolutionCollagePages] = useState<string[]>(
    [],
  );
  const [solutionNameList, setSolutionNameList] = useState<string[]>([]);
  const [uploadedFolders, setUploadedFolders] = useState<{
    color: boolean;
    uncolor: boolean;
    palette: boolean;
    solutionsCollage: boolean;
  }>({ color: false, uncolor: false, palette: false, solutionsCollage: false });
  const [showStoryInput, setShowStoryInput] = useState(true);
  const [isProcessingFolder, setIsProcessingFolder] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isPreparingStep2, setIsPreparingStep2] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [beforeAfterTheme, setBeforeAfterTheme] = useState<BeforeAfterTheme>({
    backgroundColor: "#000000",
    borderColor: "#f6c64a",
    arrowColor: "#ffc24a",
    textColor: "#111111",
    labelBackgroundColor: "#ffc24a",
    transparentBackground: true,
  });
  const [beforeAfterJob, setBeforeAfterJob] = useState<{
    name: string;
    beforeUrl: string;
    afterUrl: string;
    previewUrl: string;
  } | null>(null);
  const [splitColorDropdownId, setSplitColorDropdownId] = useState<
    string | null
  >(null);
  const [keepImportScreen, setKeepImportScreen] = useState(false);
  const splitColorRef = useRef<HTMLDivElement>(null);

  // Close split color dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideSplit = (e: MouseEvent) => {
      if (
        splitColorRef.current &&
        !splitColorRef.current.contains(e.target as Node)
      ) {
        setSplitColorDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutsideSplit);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideSplit);
  }, []);

  /* ── Import Image (Batch) ── */
  const handleImportClick = useCallback(() => {
    if (isConverting) return;
    setKeepImportScreen(false);
    imageInputRef.current?.click();
  }, [isConverting]);

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
        // 1. Convert to array and Sort naturally (1, 2, 10...)
        const fileList = Array.from(files).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
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
          "square-mark",
          "hexagon-mark",
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
          const pattern: ColorByNumberGridType =
            globalGridType === "auto"
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
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );

        // Object Focus only supports the mark grid types (square / hexagon).
        const pattern: ColorByNumberGridType =
          globalGridType === "hexagon-mark" ? "hexagon-mark" : "square-mark";

        // Process sequentially to preserve order
        for (let index = 0; index < fileList.length; index++) {
          const file = fileList[index];
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          addProject(file, dataUrl, {
            id: crypto.randomUUID(),
            gridType: pattern,
            removeBackground: true,
          });
        }

        // Show the project list (like Standard Import) so the user can pick
        // square-mark / hexagon-mark before converting, instead of converting now.
        setKeepImportScreen(false);
        setCurrentStep(1);
      } catch (err) {
        console.error("Failed to import transparent images:", err);
      } finally {
        e.target.value = "";
      }
    },
    [addProject, globalGridType],
  );

  const handleDirUploadChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessingFolder(true);

    try {
      let hasColor = false;
      let hasUncolor = false;
      let hasPalette = false;
      let hasSolutionsCollage = false;
      const groups: Record<
        string,
        { color?: File; uncolor?: File; palette?: File }
      > = {};
      const solutionCollageFiles: File[] = [];

      for (const file of files) {
        const relPath = file.webkitRelativePath.toLowerCase();
        const name = file.name;

        if (
          relPath.includes("/solutions_collage/") ||
          relPath.startsWith("solutions_collage/") ||
          relPath.includes("/solution_collage/") ||
          relPath.startsWith("solution_collage/")
        ) {
          solutionCollageFiles.push(file);
          hasSolutionsCollage = true;
          continue;
        }

        if (!groups[name]) groups[name] = {};

        // Look for 'color', 'uncolor', or 'palette' anywhere in the path segments
        if (relPath.includes("/color/") || relPath.startsWith("color/")) {
          groups[name].color = file;
          hasColor = true;
        } else if (
          relPath.includes("/uncolor/") ||
          relPath.startsWith("uncolor/")
        ) {
          groups[name].uncolor = file;
          hasUncolor = true;
        } else if (
          relPath.includes("/palette/") ||
          relPath.startsWith("palette/")
        ) {
          groups[name].palette = file;
          hasPalette = true;
        } else if (
          relPath.includes("color") ||
          relPath.includes("uncolor") ||
          relPath.includes("palette")
        ) {
          // fallback
          const isColor = relPath.includes("color");
          const isPalette = relPath.includes("palette");
          groups[name][isPalette ? "palette" : isColor ? "color" : "uncolor"] =
            file;
          if (isPalette) hasPalette = true;
          else if (isColor) hasColor = true;
          else hasUncolor = true;
        }
      }

      // 2. Update status immediately
      setUploadedFolders((prev) => ({
        color: prev.color || hasColor,
        uncolor: prev.uncolor || hasUncolor,
        palette: prev.palette || hasPalette,
        solutionsCollage: prev.solutionsCollage || hasSolutionsCollage,
      }));

      const readFile = (f: File): Promise<string> =>
        new Promise((resolve, reject) => {
          const rd = new FileReader();
          rd.onload = () => resolve(rd.result as string);
          rd.onerror = reject;
          rd.readAsDataURL(f);
        });

      if (solutionCollageFiles.length > 0) {
        const sortedSolutionCollageFiles = solutionCollageFiles.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );
        const pages = await Promise.all(
          sortedSolutionCollageFiles.map(readFile),
        );
        setSolutionCollagePages(pages);
      }

      const newDirectImages: {
        name: string;
        colorUrl: string;
        uncolorUrl: string;
        paletteUrl?: string;
      }[] = [];
      for (const [name, g] of Object.entries(groups)) {
        // To move to Step 2, we need at least the uncolor image
        if (g.uncolor) {
          newDirectImages.push({
            name,
            colorUrl: g.color ? await readFile(g.color) : "",
            uncolorUrl: await readFile(g.uncolor),
            paletteUrl: g.palette ? await readFile(g.palette) : undefined,
          });
        }
      }

      if (newDirectImages.length > 0) {
        setDirectImages((prev) => {
          // Filter out existing matches to avoid duplicates if re-uploading
          const filtered = prev.filter(
            (p) => !newDirectImages.some((n) => n.name === p.name),
          );
          const updated = [...filtered, ...newDirectImages];
          const sorted = updated.sort((a, b) =>
            a.name.localeCompare(b.name, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
          setPaletteImages(sorted.map((img) => img.paletteUrl ?? ""));
          return sorted;
        });
      }
      setIsProcessingFolder(false);
    } catch (err) {
      console.error("Folder upload failed:", err);
      setIsProcessingFolder(false);
    }

    e.target.value = "";
  };

  const removeDirectImage = (name: string) => {
    setDirectImages((prev) => prev.filter((img) => img.name !== name));
  };

  const canvasToDataUrl = (canvas: HTMLCanvasElement): string =>
    canvas.toDataURL("image/png");

  const handleBeforeAfterImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFolder(true);
    try {
      const gridType =
        globalGridType === "auto" ? "square-mark" : globalGridType;
      const isMarkGrid =
        gridType === "square-mark" || gridType === "hexagon-mark";
      const data = await imageToColorByNumber(file, {
        gridType,
        cellSize: globalCellSize,
        useDithering: true,
        removeWhiteBackground: isMarkGrid,
        removeBottomWatermark: globalExportPalette,
      });
      const theme = getThemeById(globalTheme);
      const uncolorCanvas = exportToCanvas(
        data,
        {},
        {
          showCodes: true,
          colored: false,
          showPalette: false,
          bgColor: theme.backgroundColor,
          showMagnifier: false,
        },
      );
      const colorCanvas = exportToCanvas(
        data,
        {},
        {
          showCodes:
            data.gridType === "square-mark" || data.gridType === "hexagon-mark",
          colored: true,
          showPalette: false,
          bgColor: theme.backgroundColor,
          showMagnifier: false,
        },
      );
      const beforeUrl = canvasToDataUrl(uncolorCanvas);
      const afterUrl = canvasToDataUrl(colorCanvas);
      const beforeAfterCanvas = await exportBeforeAfterToCanvas(
        beforeUrl,
        afterUrl,
        beforeAfterTheme,
      );
      setBeforeAfterJob({
        name: file.name,
        beforeUrl,
        afterUrl,
        previewUrl: beforeAfterCanvas.toDataURL("image/png"),
      });
      uncolorCanvas.width = 0;
      uncolorCanvas.height = 0;
      colorCanvas.width = 0;
      colorCanvas.height = 0;
      beforeAfterCanvas.width = 0;
      beforeAfterCanvas.height = 0;
    } catch (error) {
      console.error("Failed to generate before/after image:", error);
    } finally {
      setIsProcessingFolder(false);
      e.target.value = "";
    }
  };

  const refreshBeforeAfterPreview = async (
    themeOverride = beforeAfterTheme,
  ) => {
    const currentJob = beforeAfterJob;
    if (!currentJob) return;
    const canvas = await exportBeforeAfterToCanvas(
      currentJob.beforeUrl,
      currentJob.afterUrl,
      themeOverride,
    );
    setBeforeAfterJob((prev) =>
      prev ? { ...prev, previewUrl: canvas.toDataURL("image/png") } : prev,
    );
    canvas.width = 0;
    canvas.height = 0;
  };

  const updateBeforeAfterTheme = async (updates: Partial<BeforeAfterTheme>) => {
    const nextTheme = { ...beforeAfterTheme, ...updates };
    setBeforeAfterTheme(nextTheme);
    const currentJob = beforeAfterJob;
    if (!currentJob) return;
    const canvas = await exportBeforeAfterToCanvas(
      currentJob.beforeUrl,
      currentJob.afterUrl,
      nextTheme,
    );
    setBeforeAfterJob({
      ...currentJob,
      previewUrl: canvas.toDataURL("image/png"),
    });
    canvas.width = 0;
    canvas.height = 0;
  };

  const handleDownloadSingleBeforeAfter = async () => {
    if (!beforeAfterJob) return;
    const canvas = await exportBeforeAfterToCanvas(
      beforeAfterJob.beforeUrl,
      beforeAfterJob.afterUrl,
      beforeAfterTheme,
    );
    const baseName = beforeAfterJob.name.replace(/\.[^/.]+$/, "");
    saveAs(canvasToDpiPngBlob(canvas), `before-after-${baseName}.png`);
    canvas.width = 0;
    canvas.height = 0;
  };

  const handleDownloadBeforeAfter = async () => {
    const pairs = directImages.filter((img) => img.uncolorUrl && img.colorUrl);
    if (pairs.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("before_after");
      for (const img of pairs) {
        const canvas = await exportBeforeAfterToCanvas(
          img.uncolorUrl,
          img.colorUrl,
          beforeAfterTheme,
        );
        const baseName = img.name.replace(/\.[^/.]+$/, "");
        const base64 = canvasToDpiPngBase64(canvas);
        folder?.file(`${baseName}.png`, base64, { base64: true });
        canvas.width = 0;
        canvas.height = 0;
        await new Promise((r) => setTimeout(r, 0));
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "before_after_images.zip");
    } catch (error) {
      console.error("Failed to export before/after images:", error);
    } finally {
      setIsZipping(false);
    }
  };

  /* ── Split Color Mode Options ── */
  const SPLIT_COLOR_MODES: {
    value: PartialColorMode;
    label: string;
    icon: string;
  }[] = [
    { value: "none", label: "Full Color", icon: "🟩" },
    { value: "diagonal-bl-tr", label: "Diagonal ↗", icon: "◣" },
    { value: "diagonal-tl-br", label: "Diagonal ↘", icon: "◤" },
    { value: "horizontal-middle", label: "Top Half", icon: "⬒" },
    { value: "horizontal-sides", label: "Bottom Half", icon: "⬓" },
  ];

  const handleConvertAll = async () => {
    if (isConverting) return;
    setIsConverting(true);
    try {
      await convertAllIdleProjects();
    } finally {
      setIsConverting(false);
    }
  }; // --- PDF Setup Handlers ---
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
    setBgImages((prev) => [...prev, ...dataUrls]);
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

  const handlePaletteChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(readFileAsDataURL));
    setPaletteImages(dataUrls);
    if (directImages.length > 0) {
      setUploadedFolders((prev) => ({ ...prev, palette: true }));
    }
  };

  const handleSolutionCollageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
    if (files.length === 0) return;
    const dataUrls = await Promise.all(files.map(readFileAsDataURL));
    setSolutionCollagePages(dataUrls);
    if (directImages.length > 0) {
      setUploadedFolders((prev) => ({ ...prev, solutionsCollage: true }));
    }
  };

  const parseSolutionNamesCsv = (csvText: string): string[] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const ch = csvText[i];
      if (inQuotes) {
        if (ch === '"' && csvText[i + 1] === '"') {
          cell += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }

    row.push(cell);
    rows.push(row);

    const nonEmptyRows = rows.filter((csvRow) =>
      csvRow.some((value) => value.trim()),
    );
    if (nonEmptyRows.length === 0) return [];

    const headers = nonEmptyRows[0].map((value, index) =>
      (index === 0 ? value.replace(/^\uFEFF/, "") : value)
        .trim()
        .toLowerCase(),
    );
    const textIndex = headers.indexOf("text");
    if (textIndex === -1) return [];

    return nonEmptyRows
      .slice(1)
      .map((csvRow) => csvRow[textIndex]?.trim() ?? "")
      .filter(Boolean);
  };

  const getSolutionLabelForIndex = (index: number): string | undefined =>
    solutionNameList[index];

  const getReadyProjects = (): Project[] =>
    [...projects]
      .filter((p) => p.status === "completed")
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );

  const createProjectColorCanvas = (project: Project): HTMLCanvasElement | null => {
    if (!project.data) return null;
    const theme = getThemeById(globalTheme);
    const shouldShowPalette = project.removeBackground
      ? false
      : globalExportPalette
        ? false
        : globalShowPalette;

    return exportToCanvas(project.data, project.filled, {
      showCodes: shouldShowCodes(
        project.data,
        project.removeBackground,
        globalShowNumbers,
      ),
      colored: true,
      showPalette: shouldShowPalette,
      partialColorMode: project.partialColorMode,
      bgColor: theme.backgroundColor,
      transparentBg: project.removeBackground,
      tightCrop: shouldUseTightCrop(project.data, project.removeBackground),
      removeBgColorCells: globalExportPalette,
      showMagnifier: false,
    });
  };

  const createSolutionThumbCanvas = (
    sourceCanvas: HTMLCanvasElement,
  ): HTMLCanvasElement => {
    const maxDim = 600;
    const scale = Math.min(
      1,
      maxDim / Math.max(sourceCanvas.width, sourceCanvas.height),
    );
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = sourceCanvas.width * scale;
    thumbCanvas.height = sourceCanvas.height * scale;
    const ctx = thumbCanvas.getContext("2d");
    ctx?.drawImage(sourceCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    return thumbCanvas;
  };

  const generateSolutionCollagePageDataUrls = async (
    readyProjects: Project[],
    labels: string[] = solutionNameList,
  ): Promise<string[]> => {
    const theme = getThemeById(globalTheme);
    const colorCanvases: HTMLCanvasElement[] = [];
    const collageLabels: Array<string | undefined> = [];

    for (let idx = 0; idx < readyProjects.length; idx++) {
      const fullCanvas = createProjectColorCanvas(readyProjects[idx]);
      if (!fullCanvas) continue;

      colorCanvases.push(createSolutionThumbCanvas(fullCanvas));
      collageLabels.push(labels[idx]);
      fullCanvas.width = 0;
      fullCanvas.height = 0;
      await new Promise((r) => setTimeout(r, 0));
    }

    if (colorCanvases.length === 0) return [];

    const generatedPages = exportCollagePagesToCanvas(colorCanvases, {
      bgColor: theme.backgroundColor,
      labels: collageLabels,
    });
    colorCanvases.forEach((canvas) => {
      canvas.width = 0;
      canvas.height = 0;
    });

    return generatedPages.map((canvas) => {
      const dataUrl = canvas.toDataURL("image/png");
      canvas.width = 0;
      canvas.height = 0;
      return dataUrl;
    });
  };

  const handleSolutionNamesChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const labels = parseSolutionNamesCsv(await file.text());
    if (labels.length === 0) {
      alert('File CSV import name phải có header "text" và ít nhất một dòng.');
      e.target.value = "";
      return;
    }

    setSolutionNameList(labels);
    if (directImages.length === 0 && globalExportPalette) {
      const generatedPages = await generateSolutionCollagePageDataUrls(
        getReadyProjects(),
        labels,
      );
      setSolutionCollagePages(generatedPages);
    }
    e.target.value = "";
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
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
    if (readyProjects.length === 0 && directImages.length === 0) return;

    setCurrentStep(3);
    setIsGeneratingPdf(true);
    setPdfProgress({ current: 0, total: 100 });

    // Yield to allow React to render the loading screen before blocking the thread
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const blob = await generateBookPdf(
        {
          projects: readyProjects.map((p) => ({
            data: p.data!,
            filled: p.filled,
            partialColorMode: p.partialColorMode,
            removeBackground: p.removeBackground,
          })),
          directImages: directImages.map((img) => ({
            colorUrl: img.colorUrl,
            uncolorUrl: img.uncolorUrl,
            paletteUrl: img.paletteUrl,
          })),
          backgroundImages: bgImages,
          csvData,
          prefixPages,
          suffixPages,
          solutionPages:
            directImages.length > 0
              ? solutionCollagePages
              : globalExportPalette
                ? solutionCollagePages
                : [],
          globalOptions: {
            showCodes: globalShowNumbers,
            showPalette: globalShowPalette,
            theme: globalTheme,
            showStoryInput: showStoryInput,
            globalExportPalette:
              directImages.length > 0
                ? directImages.some((img) => !!img.paletteUrl) ||
                  paletteImages.some(Boolean)
                : globalExportPalette,
            paletteImages: paletteImages,
          },
        },
        (current: number, total: number) => {
          setPdfProgress({ current, total });
        },
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
    const readyProjects = getReadyProjects();
    if (readyProjects.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();
    const rootFolder = zip.folder("converted_images");
    const colorFolder = rootFolder?.folder("color");
    const uncolorFolder = rootFolder?.folder("uncolor");
    let circleFolder: JSZip | null = null;
    const collageFolder = rootFolder?.folder("solutions_collage");
    const paletteFolder = globalExportPalette
      ? rootFolder?.folder("palette")
      : null;

    const coloredCanvases: HTMLCanvasElement[] = [];
    const collageLabels: Array<string | undefined> = [];

    try {
      for (let i = 0; i < readyProjects.length; i++) {
        const project = readyProjects[i];
        const baseName = project.name.replace(/\.[^/.]+$/, "");
        const theme = getThemeById(globalTheme);

        const shouldShowPalette = project.removeBackground
          ? false
          : globalExportPalette
            ? false
            : globalShowPalette;
        const useObjectTightCrop = shouldUseTightCrop(
          project.data,
          project.removeBackground,
        );

        // Color version
        const canvasColor = createProjectColorCanvas(project);
        if (!canvasColor) continue;
        coloredCanvases.push(createSolutionThumbCanvas(canvasColor));
        collageLabels.push(getSolutionLabelForIndex(i));

        const base64Color = canvasToDpiPngBase64(canvasColor);
        colorFolder?.file(`${baseName}.png`, base64Color, { base64: true });

        if (
          project.removeBackground &&
          (project.data?.gridType === "square-mark" ||
            project.data?.gridType === "hexagon-mark")
        ) {
          const canvasCircle = exportDotCodeMagnifierToCanvas(project.data, {
            transparentBg: true,
          });
          const base64Circle = canvasToDpiPngBase64(canvasCircle);
          circleFolder ??= rootFolder?.folder("circle") ?? null;
          circleFolder?.file(`${baseName}.png`, base64Circle, { base64: true });
          canvasCircle.width = 0;
          canvasCircle.height = 0;
        }

        canvasColor.width = 0;
        canvasColor.height = 0;

        // Uncolored version (empty grid with numbers)
        const canvasUncolor = exportToCanvas(project.data!, project.filled, {
          showCodes: shouldShowCodes(
            project.data,
            project.removeBackground,
            !project.removeBackground,
          ),
          colored: false,
          showPalette: shouldShowPalette,
          partialColorMode: project.partialColorMode,
          bgColor: theme.backgroundColor,
          transparentBg: project.removeBackground,
          tightCrop: useObjectTightCrop,
          removeBgColorCells: globalExportPalette,
        });
        const base64Uncolor = canvasToDpiPngBase64(canvasUncolor);
        uncolorFolder?.file(`${baseName}.png`, base64Uncolor, { base64: true });

        canvasUncolor.width = 0;
        canvasUncolor.height = 0;

        // Palette export (separate file) — vertical list, swatch right, name left, droplets themed
        if (globalExportPalette && paletteFolder && project.data) {
          const canvasPalette = exportPaletteToCanvas(project.data, {
            bgColor: theme.backgroundColor,
            themeColor: theme.backgroundColor,
            pageNumber: i + 1,
            transparentBg: true,
            removeBgColorCells: true,
          });
          const base64Palette = canvasToDpiPngBase64(canvasPalette);
          paletteFolder.file(`${baseName}.png`, base64Palette, {
            base64: true,
          });

          canvasPalette.width = 0;
          canvasPalette.height = 0;
        }

        await new Promise((r) => setTimeout(r, 0));
      }

      // Generate Collage pages
      if (collageFolder && coloredCanvases.length > 0) {
        const theme = getThemeById(globalTheme);
        const collagePages = exportCollagePagesToCanvas(coloredCanvases, {
          bgColor: theme.backgroundColor,
          labels: collageLabels,
        });
        collagePages.forEach((pageCanvas, idx) => {
          const base64Page = canvasToDpiPngBase64(pageCanvas);
          collageFolder.file(`collage_page_${idx + 1}.png`, base64Page, {
            base64: true,
          });
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
    const readyProjects = getReadyProjects();
    const theme = getThemeById(globalTheme);

    // Auto-fill palette images if Export Palette is enabled and we have converted projects (Standard Mode)
    if (
      globalExportPalette &&
      readyProjects.length > 0 &&
      directImages.length === 0
    ) {
      const generatedPalettes: string[] = [];
      for (let idx = 0; idx < readyProjects.length; idx++) {
        const project = readyProjects[idx];
        if (!project.data) continue;
        const canvas = exportPaletteToCanvas(project.data, {
          bgColor: theme.backgroundColor,
          themeColor: theme.backgroundColor,
          pageNumber: idx + 1,
          transparentBg: true,
          removeBgColorCells: true,
        });
        generatedPalettes.push(canvas.toDataURL("image/png"));
        canvas.width = 0;
        canvas.height = 0;
        await new Promise((r) => setTimeout(r, 0));
      }

      setPaletteImages(generatedPalettes);
    }

    if (
      globalExportPalette &&
      readyProjects.length > 0 &&
      directImages.length === 0
    ) {
      setSolutionCollagePages(
        await generateSolutionCollagePageDataUrls(readyProjects),
      );
    }

    // Emulate brief loading for better UX
    await new Promise((resolve) => setTimeout(resolve, 600));
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
    { value: "square-mark", label: "Square mark" },
    { value: "hexagon-mark", label: "Hexagon mark" },
  ];

  const isFolderModeActive = directImages.length > 0;
  const shouldShowImportScreen =
    keepImportScreen ||
    (projects.length === 0 && !isFolderModeActive && !beforeAfterJob) ||
    (isFolderModeActive && currentStep === 1);

  if (shouldShowImportScreen) {
    return (
      <>
        <EmptyState
          handleImportClick={handleImportClick}
          handleImportTransparentClick={handleImportTransparentClick}
          dirInputRef={dirInputRef}
          handleDirUploadChange={handleDirUploadChange}
          beforeAfterInputRef={beforeAfterInputRef}
          handleBeforeAfterImageChange={handleBeforeAfterImageChange}
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

  const idleCount = projects.filter((p) => p.status === "idle").length;

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
            disabled={isConverting}
          />

          <button
            onClick={handleImportClick}
            disabled={isConverting}
            className="px-4 py-2 text-sm font-medium text-(--text-primary) border border-(--border-default) rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add More
          </button>
          {(idleCount > 0 || isConverting) && (
            <button
              onClick={handleConvertAll}
              disabled={isConverting}
              className="px-6 py-2 text-sm font-medium text-(--bg-primary) bg-(--accent) hover:bg-(--accent-hover) rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[150px]"
            >
              {isConverting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Converting...
                </>
              ) : (
                `Convert All (${idleCount})`
              )}
            </button>
          )}
          {currentStep === 1 &&
            (projects.length > 0 || directImages.length > 0) &&
            idleCount === 0 &&
            !isConverting && (
              <div className="flex gap-3">
                {projects.length > 0 && (
                  <button
                    onClick={handleDownloadAllImages}
                    disabled={isZipping || isConverting}
                    className="px-6 py-2 text-sm font-medium text-(--accent) border border-(--accent)/30 bg-(--accent)/5 hover:bg-(--accent)/10 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isZipping ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                    Download All (.zip)
                  </button>
                )}
                {directImages.some((img) => img.colorUrl && img.uncolorUrl) && (
                  <button
                    onClick={handleDownloadBeforeAfter}
                    disabled={isZipping || isConverting}
                    className="px-6 py-2 text-sm font-medium text-yellow-300 border border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/15 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isZipping ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    )}
                    Before/After
                  </button>
                )}
                <button
                  onClick={handleNextToSetup}
                  disabled={isConverting || isPreparingStep2}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreparingStep2 ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Next: Setup PDF
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
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
            disabled={isConverting}
            onChange={handleImageFileChange}
          />
        </div>
      </div>

      {/* Wizard Step 1: Grid of Project Cards */}
      {currentStep === 1 && (
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          {beforeAfterJob && (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="mr-2">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      Before/After Settings
                    </div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {beforeAfterJob.name}
                    </div>
                  </div>
                  {[
                    ["backgroundColor", "Background"],
                    ["borderColor", "Border"],
                    ["arrowColor", "Arrow"],
                    ["labelBackgroundColor", "Text Box"],
                    ["textColor", "Text"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                    >
                      <span>{label}</span>
                      <input
                        type="color"
                        value={
                          beforeAfterTheme[
                            key as keyof BeforeAfterTheme
                          ] as string
                        }
                        onChange={(e) =>
                          void updateBeforeAfterTheme({
                            [key]: e.target.value,
                          } as Partial<BeforeAfterTheme>)
                        }
                        className="h-8 w-10 rounded border border-[var(--border-default)] bg-transparent"
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={beforeAfterTheme.transparentBackground}
                      onChange={(e) =>
                        void updateBeforeAfterTheme({
                          transparentBackground: e.target.checked,
                        })
                      }
                    />
                    Transparent background
                  </label>
                </div>
              </div>
              <div className="flex-1 min-h-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 flex items-center justify-center overflow-auto">
                <img
                  src={beforeAfterJob.previewUrl}
                  alt="Before after preview"
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
              <div className="shrink-0 flex justify-center gap-3">
                <button
                  onClick={() => beforeAfterInputRef.current?.click()}
                  disabled={isProcessingFolder}
                  className="px-5 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors"
                >
                  Choose Another Image
                </button>
                <button
                  onClick={handleDownloadSingleBeforeAfter}
                  className="px-6 py-2 text-sm font-medium text-yellow-300 border border-yellow-400/40 bg-yellow-400/10 hover:bg-yellow-400/15 rounded-lg shadow-sm transition-colors"
                >
                  Download Before/After
                </button>
              </div>
            </div>
          )}
          {!beforeAfterJob && (
            <>
              {directImages.some((img) => img.colorUrl && img.uncolorUrl) && (
                <div className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="mr-2">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        Before/After Export
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Uses uncolor as before and color as after.
                      </div>
                    </div>
                    {[
                      ["backgroundColor", "Background"],
                      ["borderColor", "Border"],
                      ["arrowColor", "Arrow"],
                      ["textColor", "Text"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                      >
                        <span>{label}</span>
                        <input
                          type="color"
                          value={
                            beforeAfterTheme[
                              key as keyof BeforeAfterTheme
                            ] as string
                          }
                          onChange={(e) =>
                            setBeforeAfterTheme((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          className="h-8 w-10 rounded border border-[var(--border-default)] bg-transparent"
                        />
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={beforeAfterTheme.transparentBackground}
                        onChange={(e) =>
                          setBeforeAfterTheme((prev) => ({
                            ...prev,
                            transparentBackground: e.target.checked,
                          }))
                        }
                      />
                      Transparent background
                    </label>
                  </div>
                </div>
              )}
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
                isConverting={isConverting}
              />
            </>
          )}
        </div>
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
          solutionCollagePages={solutionCollagePages}
          setSolutionCollagePages={setSolutionCollagePages}
          solutionCollageInputRef={solutionCollageInputRef}
          handleSolutionCollageChange={handleSolutionCollageChange}
          solutionNameList={solutionNameList}
          solutionNamesInputRef={solutionNamesInputRef}
          handleSolutionNamesChange={handleSolutionNamesChange}
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
