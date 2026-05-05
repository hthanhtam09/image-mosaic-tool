/**
 * Color by Number Store – interactive tô màu theo số
 */

import { create } from "zustand";
import type {
  ColorByNumberData,
  ColorByNumberGridType,
  FilledMap,
} from "@/lib/colorByNumber";
import { imageToColorByNumber } from "@/lib/colorByNumber";


export interface Project {
  id: string;
  name: string;
  originalFile: File;
  thumbnailDataUrl: string;
  data: ColorByNumberData | null;
  filled: FilledMap;
  selectedCode: string | null;

  status: "idle" | "processing" | "completed" | "error"; // Added status

  // Independent settings
  removeBackground: boolean;
  gridType: ColorByNumberGridType;
  useDithering: boolean;
  /** Partial color split mode: 'none' | 'diagonal-bl-tr' | 'diagonal-tl-br' | 'horizontal-middle' | 'horizontal-sides' */
  partialColorMode:
    | "none"
    | "diagonal-bl-tr"
    | "diagonal-tl-br"
    | "horizontal-middle"
    | "horizontal-sides";

  // Viewport
  zoom: number;
  panX: number;
  panY: number;
}

export interface ColorByNumberState {
  // Global / UI state
  isPaletteVisible: boolean;

  // Global settings (shared across all projects)
  globalCellSize: number;
  globalShowNumbers: boolean;
  globalShowPalette: boolean;
  globalTheme: string;
  /** Export a separate palette PNG per image in the zip */
  globalExportPalette: boolean;
  /** Force a specific grid type for all Standard imports. 'auto' = cycle through patterns */
  globalGridType: ColorByNumberGridType | 'auto';


  // Projects
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  togglePaletteGlobal: () => void;

  // Global settings actions
  setGlobalCellSize: (size: number) => void;
  toggleGlobalShowNumbers: () => void;
  toggleGlobalShowPalette: () => void;
  setGlobalTheme: (theme: string) => void;
  toggleGlobalExportPalette: () => void;
  setGlobalGridType: (gridType: ColorByNumberGridType | 'auto') => void;


  // Project Management
  addProject: (file: File, dataUrl: string, options?: Partial<Project>) => void;
  setActiveProject: (id: string | null) => void;
  removeProject: (id: string) => void;
  updateActiveProject: (updates: Partial<Project>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;

  // Batch Actions
  convertAllIdleProjects: () => Promise<void>;

  // Actions that modify the ACTIVE project
  setZoom: (zoom: number) => void;
  setPan: (panX: number, panY: number) => void;
  fillCell: (x: number, y: number) => void;
  setSelectedCode: (code: string | null) => void;
  resetFill: () => void;

  // Async actions
  updateActiveProjectData: (data: ColorByNumberData) => void;
}

export const useColorByNumberStore = create<ColorByNumberState>((set, get) => ({
  isPaletteVisible: true,
  globalCellSize: 29,
  globalShowNumbers: true,
  globalShowPalette: true,
  globalTheme: "light",
  globalExportPalette: false,
  globalGridType: 'auto',
  projects: [],
  activeProjectId: null,

  togglePaletteGlobal: () =>
    set((state) => ({ isPaletteVisible: !state.isPaletteVisible })),

  // Global settings actions
  setGlobalCellSize: (size) => {
    set((state) => ({
      globalCellSize: size,
      // Reset all completed projects to idle so they re-convert with new cell size
      projects: state.projects.map((p) =>
        p.status === "completed" ? { ...p, status: "idle" as const } : p,
      ),
    }));
  },

  toggleGlobalShowNumbers: () =>
    set((state) => ({
      globalShowNumbers: !state.globalShowNumbers,
      projects: state.projects.map((p) =>
        p.status === "completed" ? { ...p, status: "idle" as const } : p,
      ),
    })),
  toggleGlobalShowPalette: () =>
    set((state) => ({
      globalShowPalette: !state.globalShowPalette,
      projects: state.projects.map((p) =>
        p.status === "completed" ? { ...p, status: "idle" as const } : p,
      ),
    })),
  setGlobalTheme: (theme) =>
    set((state) => ({
      globalTheme: theme,
      projects: state.projects.map((p) =>
        p.status === "completed" ? { ...p, status: "idle" as const } : p,
      ),
    })),

  toggleGlobalExportPalette: () =>
    set((state) => {
      const turningOn = !state.globalExportPalette;
      return {
        globalExportPalette: turningOn,
        // When turning ON palette export, auto-disable show palette for cleaner image output
        ...(turningOn ? { globalShowPalette: false } : {}),
        // Reset completed projects so they re-export with the new setting
        projects: state.projects.map((p) =>
          p.status === "completed" ? { ...p, status: "idle" as const } : p,
        ),
      };
    }),

  setGlobalGridType: (gridType) =>
    set((state) => ({
      globalGridType: gridType,
      // When a specific pattern is selected (not 'auto'), update ALL existing standard projects
      // to use the new grid type and reset them so they re-convert
      projects: gridType === 'auto'
        ? state.projects
        : state.projects.map((p) => ({
            ...p,
            // Only update non-Object Focus projects
            gridType: p.removeBackground ? p.gridType : gridType as ColorByNumberGridType,
            // Reset completed non-Object Focus projects so they re-convert with the new pattern
            status: (!p.removeBackground && p.status === "completed") ? "idle" as const : p.status,
          })),
    })),

  addProject: (file, dataUrl, options = {}) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: file.name,
      originalFile: file,
      thumbnailDataUrl: dataUrl,
      data: null,
      status: "idle",
      filled: {},
      selectedCode: null,
      removeBackground: false,
      gridType: "standard",
      useDithering: true,
      partialColorMode: "none",
      zoom: 1,
      panX: 0,
      panY: 0,
      ...options,
    };

    set((state) => ({
      projects: [...state.projects, newProject],
    }));
  },

  setActiveProject: (id) => set({ activeProjectId: id }),

  removeProject: (id) =>
    set((state) => {
      const newProjects = state.projects.filter((p) => p.id !== id);
      let newActiveId = state.activeProjectId;
      if (state.activeProjectId === id) {
        newActiveId = null; // Close modal/preview if deleted
      }
      return { projects: newProjects, activeProjectId: newActiveId };
    }),

  updateActiveProject: (updates) =>
    set((state) => {
      if (!state.activeProjectId) return {};
      return {
        projects: state.projects.map((p) =>
          p.id === state.activeProjectId ? { ...p, ...updates } : p,
        ),
      };
    }),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p,
      ),
    })),

  convertAllIdleProjects: async () => {
    const { projects, updateProject, globalCellSize, globalExportPalette } = get();

    // Filter projects that need processing
    const idleProjects = projects.filter(
      (p) => p.status === "idle" || p.status === "error",
    );
    if (idleProjects.length === 0) return;

    // Mark as processing
    idleProjects.forEach((p) => updateProject(p.id, { status: "processing" }));

    // Parallel processing with concurrency limit
    // Use available CPU cores (workers run off main thread so higher concurrency is safe)
    const cpuCores = typeof navigator !== "undefined" && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;
    const limit = Math.min(Math.max(cpuCores, 2), 6);
    const queue = [...idleProjects];
    
    const runProcessor = async () => {
      while (queue.length > 0) {
        const p = queue.shift();
        if (!p) break;

        try {
          const result = await imageToColorByNumber(p.originalFile, {
            gridType: p.gridType,
            cellSize: globalCellSize,
            useDithering: p.useDithering,
            removeWhiteBackground: p.removeBackground,
            removeBottomWatermark: globalExportPalette,
          });
          updateProject(p.id, { data: result, status: "completed" });
        } catch (e) {
          console.error(`Failed to convert project ${p.id}`, e);
          updateProject(p.id, { status: "error" });
        }
      }
    };

    // Spawn up to 'limit' processors
    const processors = [];
    for (let i = 0; i < Math.min(limit, idleProjects.length); i++) {
      processors.push(runProcessor());
    }

    await Promise.all(processors);
  },

  // --- Actions working on Active Project ---

  setZoom: (zoom) => {
    const z = Math.max(0.05, Math.min(20, zoom));
    get().updateActiveProject({ zoom: z });
  },

  setPan: (panX, panY) => {
    get().updateActiveProject({ panX, panY });
  },

  fillCell: (x, y) => {
    const { projects, activeProjectId } = get();
    const activeProject = projects.find((p) => p.id === activeProjectId);
    if (!activeProject || !activeProject.data || !activeProject.selectedCode)
      return;

    const cell = activeProject.data.cells.find((c) => c.x === x && c.y === y);
    if (!cell || cell.code !== activeProject.selectedCode) return;

    const key = `${x},${y}`;
    const newFilled = { ...activeProject.filled, [key]: true };
    get().updateActiveProject({ filled: newFilled });
  },

  setSelectedCode: (code) => {
    get().updateActiveProject({ selectedCode: code });
  },

  resetFill: () => {
    get().updateActiveProject({ filled: {} });
  },

  setUseDithering: (use: boolean) => {
    get().updateActiveProject({ useDithering: use });
  },

  updateActiveProjectData: (data) => {
    get().updateActiveProject({ data, filled: {} });
  },
}));

// Selectors
export const useActiveProject = () => {
  const store = useColorByNumberStore();
  return store.projects.find((p) => p.id === store.activeProjectId) || null;
};
