'use client'

import type { BeforeAfterTheme } from '@/lib/colorByNumber/beforeAfter'
import type { ColorByNumberGridType } from '@/lib/colorByNumber'

type BeforeAfterMarkGridType = Extract<ColorByNumberGridType, 'square-mark' | 'hexagon-mark'>

type DirectImage = { name: string; colorUrl: string; uncolorUrl: string; paletteUrl?: string }

type BeforeAfterJob = {
  name: string
  sourceFile: File
  beforeUrl: string
  afterUrl: string
  previewUrl: string
}

interface BeforeAfterPanelProps {
  beforeAfterJob: BeforeAfterJob | null
  beforeAfterTheme: BeforeAfterTheme
  setBeforeAfterTheme: React.Dispatch<React.SetStateAction<BeforeAfterTheme>>
  beforeAfterGridType: BeforeAfterMarkGridType
  isProcessingFolder: boolean
  directImages: DirectImage[]
  beforeAfterInputRef: React.RefObject<HTMLInputElement | null>
  updateBeforeAfterGridType: (gridType: BeforeAfterMarkGridType) => Promise<void>
  updateBeforeAfterTheme: (updates: Partial<BeforeAfterTheme>) => Promise<void>
  handleDownloadSingleBeforeAfter: () => Promise<void>
}

const COLOR_FIELDS_SINGLE: [keyof BeforeAfterTheme, string][] = [
  ['backgroundColor', 'Background'],
  ['borderColor', 'Border'],
  ['arrowColor', 'Arrow'],
  ['labelBackgroundColor', 'Text Box'],
  ['textColor', 'Text'],
]

const COLOR_FIELDS_FOLDER: [keyof BeforeAfterTheme, string][] = [
  ['backgroundColor', 'Background'],
  ['borderColor', 'Border'],
  ['arrowColor', 'Arrow'],
  ['textColor', 'Text'],
]

export default function BeforeAfterPanel({
  beforeAfterJob,
  beforeAfterTheme,
  setBeforeAfterTheme,
  beforeAfterGridType,
  isProcessingFolder,
  directImages,
  beforeAfterInputRef,
  updateBeforeAfterGridType,
  updateBeforeAfterTheme,
  handleDownloadSingleBeforeAfter,
}: BeforeAfterPanelProps) {
  if (beforeAfterJob) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="mr-2">
              <div className="text-sm font-semibold text-(--text-primary)">Before/After Settings</div>
              <div className="text-xs text-(--text-secondary)">{beforeAfterJob.name}</div>
            </div>
            {COLOR_FIELDS_SINGLE.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-(--text-secondary)">
                <span>{label}</span>
                <input
                  type="color"
                  value={beforeAfterTheme[key] as string}
                  onChange={(e) => void updateBeforeAfterTheme({ [key]: e.target.value } as Partial<BeforeAfterTheme>)}
                  className="h-8 w-10 rounded border border-[var(--border-default)] bg-transparent"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
              <span>Mark</span>
              <select
                value={beforeAfterGridType}
                disabled={isProcessingFolder}
                onChange={(e) => void updateBeforeAfterGridType(e.target.value as BeforeAfterMarkGridType)}
                className="h-8 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 text-(--text-primary)"
              >
                <option value="square-mark">Square mark</option>
                <option value="hexagon-mark">Hexagon mark</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
              <input
                type="checkbox"
                checked={beforeAfterTheme.transparentBackground}
                onChange={(e) => void updateBeforeAfterTheme({ transparentBackground: e.target.checked })}
              />
              Transparent background
            </label>
          </div>
        </div>
        <div className="flex-1 min-h-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 flex items-center justify-center overflow-auto">
          <img src={beforeAfterJob.previewUrl} alt="Before after preview" className="max-h-full max-w-full object-contain rounded-lg" />
        </div>
        <div className="shrink-0 flex justify-center gap-3">
          <button
            onClick={() => beforeAfterInputRef.current?.click()}
            disabled={isProcessingFolder}
            className="px-5 py-2 text-sm font-medium text-(--text-primary) border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors"
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
    )
  }

  if (directImages.some((img) => img.colorUrl && img.uncolorUrl)) {
    return (
      <div className="shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="mr-2">
            <div className="text-sm font-semibold text-(--text-primary)">Before/After Export</div>
            <div className="text-xs text-(--text-secondary)">Uses uncolor as before and color as after.</div>
          </div>
          {COLOR_FIELDS_FOLDER.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs text-(--text-secondary)">
              <span>{label}</span>
              <input
                type="color"
                value={beforeAfterTheme[key] as string}
                onChange={(e) => setBeforeAfterTheme((prev) => ({ ...prev, [key]: e.target.value }))}
                className="h-8 w-10 rounded border border-[var(--border-default)] bg-transparent"
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-xs text-(--text-secondary)">
            <input
              type="checkbox"
              checked={beforeAfterTheme.transparentBackground}
              onChange={(e) => setBeforeAfterTheme((prev) => ({ ...prev, transparentBackground: e.target.checked }))}
            />
            Transparent background
          </label>
        </div>
      </div>
    )
  }

  return null
}
