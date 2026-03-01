/**
 * Color by Number Store – interactive tô màu theo số
 */

import { create } from "zustand";
import type {
  ColorByNumberData,
  ColorByNumberCell,
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
  
  status: 'idle' | 'processing' | 'completed' | 'error'; // Added status

  // Independent settings
  gridType: ColorByNumberGridType;
  useDithering: boolean;
  /** Partial color split mode: 'none' | 'diagonal-bl-tr' | 'diagonal-tl-br' | 'horizontal-middle' | 'horizontal-sides' */
  partialColorMode: 'none' | 'diagonal-bl-tr' | 'diagonal-tl-br' | 'horizontal-middle' | 'horizontal-sides';

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
  
  // Projects
  projects: Project[];
  activeProjectId: string | null;

  // Actions
  togglePaletteGlobal: () => void;

  // Global settings actions
  setGlobalCellSize: (size: number) => void;
  toggleGlobalShowNumbers: () => void;
  toggleGlobalShowPalette: () => void;

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
  projects: [],
  activeProjectId: null,

  togglePaletteGlobal: () => set((state) => ({ isPaletteVisible: !state.isPaletteVisible })),

  // Global settings actions
  setGlobalCellSize: (size) => {
    set((state) => ({
      globalCellSize: size,
      // Reset all completed projects to idle so they re-convert with new cell size
      projects: state.projects.map(p => 
        p.status === 'completed' ? { ...p, status: 'idle' as const } : p
      ),
    }));
  },

  toggleGlobalShowNumbers: () => set((state) => ({ globalShowNumbers: !state.globalShowNumbers })),
  toggleGlobalShowPalette: () => set((state) => ({ globalShowPalette: !state.globalShowPalette })),

  addProject: (file, dataUrl, options = {}) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: file.name,
      originalFile: file,
      thumbnailDataUrl: dataUrl,
      data: null,
      status: 'idle',
      filled: {},
      selectedCode: null,
      gridType: "standard",
      useDithering: true,
      partialColorMode: 'none',
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

  removeProject: (id) => set((state) => {
    const newProjects = state.projects.filter(p => p.id !== id);
    let newActiveId = state.activeProjectId;
    if (state.activeProjectId === id) {
        newActiveId = null; // Close modal/preview if deleted
    }
    return { projects: newProjects, activeProjectId: newActiveId };
  }),

  updateActiveProject: (updates) => set((state) => {
    if (!state.activeProjectId) return {};
    return {
        projects: state.projects.map(p => 
            p.id === state.activeProjectId ? { ...p, ...updates } : p
        )
    };
  }),

  updateProject: (id, updates) => set((state) => ({
    projects: state.projects.map(p => 
        p.id === id ? { ...p, ...updates } : p
    )
  })),

  convertAllIdleProjects: async () => {
      const { projects, updateProject } = get();
      
      // Filter projects that need processing
      const idleProjects = projects.filter(p => p.status === 'idle' || p.status === 'error');
      if (idleProjects.length === 0) return;

      // Mark as processing
      idleProjects.forEach(p => updateProject(p.id, { status: 'processing' }));

      // Process sequentially to prevent UI freezing
      const { globalCellSize } = get();
      for (const p of idleProjects) {
          try {
              // Yield to main thread to allow UI updates
              await new Promise(resolve => setTimeout(resolve, 50));

              const result = await imageToColorByNumber(p.originalFile, {
                  gridType: p.gridType,
                  cellSize: globalCellSize,
                  useDithering: p.useDithering,
              });
              updateProject(p.id, { data: result, status: 'completed' });
          } catch (e) {
              console.error(`Failed to convert project ${p.id}`, e);
              updateProject(p.id, { status: 'error' });
          }
      }
  },

  // --- Actions working on Active Project ---

  setZoom: (zoom) => {
    const z = Math.max(0.25, Math.min(4, zoom));
    get().updateActiveProject({ zoom: z });
  },

  setPan: (panX, panY) => {
    get().updateActiveProject({ panX, panY });
  },

  fillCell: (x, y) => {
    const { projects, activeProjectId } = get();
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!activeProject || !activeProject.data || !activeProject.selectedCode) return;

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
  }

}));

// Selectors
export const useActiveProject = () => {
    const store = useColorByNumberStore();
    return store.projects.find(p => p.id === store.activeProjectId) || null;
};
