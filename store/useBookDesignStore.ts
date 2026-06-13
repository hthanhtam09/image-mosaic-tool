/**
 * Book Design Store – user configuration for how the coloring book looks.
 * Covers palette page style and coloring page layout/theme/pattern.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ColorByNumberGridType } from '@/lib/colorByNumber'

// How each color code cell is labelled on the palette page
export type BadgeStyle = 'letter' | 'mixed'

// Layout of the coloring page: palette on its own page vs beside the grid
export type ColoringDisplayMode = 'full-screen' | 'side-by-side'

export interface BookDesignState {
  // --- Palette Page Config ---
  /** Label style applied to palette cells: letter (A-Z…), mixed (A1, B2…) */
  badgeStyle: BadgeStyle
  /** Show a waterdrop icon on each palette swatch */
  showWaterdropIcon: boolean
  /** Show hex color input field below each palette swatch */
  showColorInput: boolean
  /** Optional image URL to use as badge background (numbers rendered on top) */
  badgeBgImageUrl: string | null
  /** Badge background image blob URL (stored separately so we can revoke on unmount) */
  badgeBgImageFile: File | null

  // --- Typography Config ---
  /** Custom uploaded font name */
  customFontName: string | null
  /** Custom uploaded font base64 string */
  customFontBase64: string | null
  /** Custom font file extension (e.g. ttf, otf) */
  customFontExtension: string | null

  // --- Coloring Page Config ---
  /** Full screen: palette on its own page. Side-by-side: palette beside the grid. */
  coloringDisplayMode: ColoringDisplayMode
  /** Theme id – matches keys in THEMES from lib/colorByNumber/themes */
  coloringTheme: string
  /** Grid pattern for the coloring page */
  coloringPattern: ColorByNumberGridType | 'auto'
  /** Show numbers on the colored page preview */
  showColoredNumbers: boolean

  // --- Actions ---
  setBadgeStyle: (style: BadgeStyle) => void
  toggleWaterdropIcon: () => void
  toggleColorInput: () => void
  setBadgeBgImage: (file: File | null, url: string | null) => void
  setCustomFont: (name: string | null, base64: string | null, extension: string | null) => void
  setColoringDisplayMode: (mode: ColoringDisplayMode) => void
  setColoringTheme: (theme: string) => void
  setColoringPattern: (pattern: ColorByNumberGridType | 'auto') => void
  toggleColoredNumbers: () => void
  resetToDefaults: () => void
}

const defaults = {
  badgeStyle: 'mixed' as BadgeStyle,
  showWaterdropIcon: false,
  showColorInput: false,
  badgeBgImageUrl: null,
  badgeBgImageFile: null,
  customFontName: null,
  customFontBase64: null,
  customFontExtension: null,
  coloringDisplayMode: 'full-screen' as ColoringDisplayMode,
  coloringTheme: 'light',
  coloringPattern: 'standard' as ColorByNumberGridType | 'auto',
  showColoredNumbers: false,
}

export const useBookDesignStore = create<BookDesignState>()(
  persist(
    (set) => ({
      ...defaults,

      setBadgeStyle: (style) => set({ badgeStyle: style }),
      toggleWaterdropIcon: () => set((s) => ({ showWaterdropIcon: !s.showWaterdropIcon })),
      toggleColorInput: () => set((s) => ({ showColorInput: !s.showColorInput })),
      setBadgeBgImage: (file, url) => set({ badgeBgImageFile: file, badgeBgImageUrl: url }),
      setCustomFont: (name, base64, extension) => set({ customFontName: name, customFontBase64: base64, customFontExtension: extension }),
      setColoringDisplayMode: (mode) => set({ coloringDisplayMode: mode }),
      setColoringTheme: (theme) => set({ coloringTheme: theme }),
      setColoringPattern: (pattern) => set({ coloringPattern: pattern }),
      toggleColoredNumbers: () => set((s) => ({ showColoredNumbers: !s.showColoredNumbers })),
      resetToDefaults: () => set({ ...defaults }),
    }),
    {
      name: 'book-design-store',
      version: 1,
      // Don't persist File objects (not serialisable)
      partialize: (state) => ({
        badgeStyle: state.badgeStyle,
        showWaterdropIcon: state.showWaterdropIcon,
        showColorInput: state.showColorInput,
        badgeBgImageUrl: null, // never persist blob URLs
        badgeBgImageFile: null,
        customFontName: state.customFontName,
        customFontBase64: state.customFontBase64,
        customFontExtension: state.customFontExtension,
        coloringDisplayMode: state.coloringDisplayMode,
        coloringTheme: state.coloringTheme,
        coloringPattern: state.coloringPattern,
        showColoredNumbers: state.showColoredNumbers,
      }),
      // Migrate old 'number' badge style to 'mixed' (removed in v1)
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Partial<BookDesignState>
        if (version < 1 && (state as { badgeStyle?: string }).badgeStyle === 'number') {
          return { ...state, badgeStyle: 'mixed' as BadgeStyle }
        }
        return state
      },
    },
  ),
)

if (typeof window !== 'undefined') {
  try {
    const proto = CanvasRenderingContext2D.prototype;
    const originalDescriptor = Object.getOwnPropertyDescriptor(proto, 'font');
    if (originalDescriptor && originalDescriptor.set && !('__intercepted' in proto)) {
      const originalSet = originalDescriptor.set;
      const originalGet = originalDescriptor.get;
      
      Object.defineProperty(proto, 'font', {
        ...originalDescriptor,
        get: function() {
          return originalGet ? originalGet.call(this) : '';
        },
        set: function(value) {
          let valStr = String(value);
          const customFontName = useBookDesignStore.getState().customFontName;
          if (customFontName) {
            valStr = valStr
              .replace(/'Noto Sans'/g, `'${customFontName}'`)
              .replace(/"Noto Sans"/g, `'${customFontName}'`)
              .replace(/Noto Sans/g, `'${customFontName}'`);
          }
          originalSet.call(this, valStr);
        }
      });
      Object.defineProperty(proto, '__intercepted', {
        value: true,
        writable: false,
        configurable: true
      });
    }
  } catch (err) {
    console.error('Failed to patch CanvasRenderingContext2D.prototype.font:', err);
  }
}
