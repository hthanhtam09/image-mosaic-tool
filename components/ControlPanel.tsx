'use client';

/**
 * ControlPanel Component
 *
 * Clean sidebar with professional styling and icon-based UI.
 */

import { useEditorStore } from '@/store/useEditorStore';
import {
  downloadCanvas,
  LETTER_OUTPUT_WIDTH,
  LETTER_OUTPUT_HEIGHT,
  paletteIndexToLabel,
  rgbToHex,
} from '@/lib/utils';
import { exportPalette, exportGridTemplate } from '@/lib/export';
import { renderMosaicWithNumbersToCanvas } from '@/lib/pixelate';
import { mosaicBlocksToCells, STROKE_GRID_PX } from '@/lib/grid';
import ImageUploader from './ImageUploader';

const IconUpload = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const IconPalette = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
  </svg>
);

const IconGrid = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const IconDisplay = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const IconExport = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const IconImage = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const IconPaletteExport = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const IconDocument = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const SectionHeader = ({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[var(--text-secondary)]">
      {icon}
    </div>
    <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
  </div>
);

export default function ControlPanel() {
  const {
    blockSize,
    showGrid,
    showNumbers,
    setBlockSize,
    toggleGrid,
    toggleNumbers,
    setGridType,
    setGridRows,
    setGridCols,
    originalImage,
    palette,
    fixedPaletteIndices,
    mosaicBlocks,
    processedImageData,
    gridType,
    gridRows,
    gridCols,
  } = useEditorStore();

  const handleExportMosaic = () => {
    if (!processedImageData || mosaicBlocks.length === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = LETTER_OUTPUT_WIDTH;
    canvas.height = LETTER_OUTPUT_HEIGHT;
    renderMosaicWithNumbersToCanvas(
      canvas,
      mosaicBlocks,
      blockSize,
      showGrid,
      processedImageData.width,
      processedImageData.height
    );
    downloadCanvas(canvas, `mosaic-${Date.now()}.png`);
  };

  const handleExportPalette = () => {
    if (palette.length > 0) {
      exportPalette(palette, fixedPaletteIndices);
    }
  };

  const handleExportTemplate = () => {
    if (processedImageData && mosaicBlocks.length > 0) {
      const rows = Math.ceil(processedImageData.height / blockSize);
      const cols = Math.ceil(processedImageData.width / blockSize);
      const cells = mosaicBlocksToCells(
        mosaicBlocks,
        blockSize,
        paletteIndexToLabel,
        rgbToHex
      );
      const gridConfig = {
        type: gridType,
        rows,
        cols,
        showBorder: showGrid,
        borderWidth: STROKE_GRID_PX,
      };
      exportGridTemplate(gridConfig, cells, {
        exportMode: 'lineArt',
        showNumbers: true,
      });
    }
  };

  const handleExportNoNumber = () => {
    if (processedImageData && mosaicBlocks.length > 0) {
      const rows = Math.ceil(processedImageData.height / blockSize);
      const cols = Math.ceil(processedImageData.width / blockSize);
      const cells = mosaicBlocksToCells(
        mosaicBlocks,
        blockSize,
        paletteIndexToLabel,
        rgbToHex
      );
      const gridConfig = {
        type: gridType,
        rows,
        cols,
        showBorder: showGrid,
        borderWidth: STROKE_GRID_PX,
      };
      exportGridTemplate(gridConfig, cells, {
        exportMode: 'noNumber',
        showNumbers: false,
      });
    }
  };

  const handleExportColored = () => {
    if (processedImageData && mosaicBlocks.length > 0) {
      const rows = Math.ceil(processedImageData.height / blockSize);
      const cols = Math.ceil(processedImageData.width / blockSize);
      const cells = mosaicBlocksToCells(
        mosaicBlocks,
        blockSize,
        paletteIndexToLabel,
        rgbToHex
      );
      const gridConfig = {
        type: gridType,
        rows,
        cols,
        showBorder: showGrid,
        borderWidth: STROKE_GRID_PX,
      };
      exportGridTemplate(gridConfig, cells, {
        exportMode: 'colored',
        showNumbers: showNumbers,
      });
    }
  };

  return (
    <aside className="flex h-screen w-80 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <header className="shrink-0 border-b border-[var(--border-subtle)] px-6 py-5">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
          Image Mosaic
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Color-by-number generator
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
        <section className="card p-4">
          <SectionHeader icon={<IconUpload />} title="Upload Image" />
          <ImageUploader />
        </section>

        {originalImage && (
          <>
            <section className="card p-4">
              <SectionHeader icon={<IconGrid />} title="Block Size" />
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="blockSize"
                    className="text-sm text-[var(--text-secondary)]"
                  >
                    Pixel size
                  </label>
                  <span className="rounded-md bg-[var(--accent-muted)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                    {blockSize}px
                  </span>
                </div>
                <input
                  id="blockSize"
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={blockSize}
                  onChange={(e) => setBlockSize(Number(e.target.value))}
                  className="mt-3 w-full"
                  aria-label="Block size"
                />
                <div className="mt-1.5 flex justify-between text-xs text-[var(--text-muted)]">
                  <span>10px</span>
                  <span>50px</span>
                </div>
              </div>
            </section>

            <section className="card p-4">
              <SectionHeader icon={<IconGrid />} title="Grid Template" />
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="gridType"
                    className="mb-1.5 block text-sm text-[var(--text-secondary)]"
                  >
                    Grid type
                  </label>
                  <select
                    id="gridType"
                    value={gridType}
                    onChange={(e) =>
                      setGridType(e.target.value as 'square' | 'diamond' | 'dot')
                    }
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    aria-label="Grid type"
                  >
                    <option value="square">Squares Grid</option>
                    <option value="diamond">Diamonds Grid</option>
                    <option value="dot">Dots Grid</option>
                  </select>
                </div>
                {processedImageData && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Grid: {Math.ceil(processedImageData.height / blockSize)} ×{' '}
                    {Math.ceil(processedImageData.width / blockSize)} (rows × cols)
                  </p>
                )}
                {!originalImage && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="gridRows"
                        className="mb-1 block text-xs text-[var(--text-muted)]"
                      >
                        Rows
                      </label>
                      <input
                        id="gridRows"
                        type="number"
                        min={1}
                        max={100}
                        value={gridRows}
                        onChange={(e) =>
                          setGridRows(Number.parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                        aria-label="Grid rows"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="gridCols"
                        className="mb-1 block text-xs text-[var(--text-muted)]"
                      >
                        Cols
                      </label>
                      <input
                        id="gridCols"
                        type="number"
                        min={1}
                        max={100}
                        value={gridCols}
                        onChange={(e) =>
                          setGridCols(Number.parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-[var(--text-primary)]"
                        aria-label="Grid columns"
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="card p-4">
              <SectionHeader icon={<IconDisplay />} title="Display" />
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-white/[0.02]">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={toggleGrid}
                    className="h-4 w-4 rounded border-white/20"
                    aria-label="Show grid lines"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Grid lines
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg py-2.5 transition-colors hover:bg-white/[0.02]">
                  <input
                    type="checkbox"
                    checked={showNumbers}
                    onChange={toggleNumbers}
                    className="h-4 w-4 rounded border-white/20"
                    aria-label="Show block numbers"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    Block numbers
                  </span>
                </label>
              </div>
            </section>

            <section className="card p-4">
              <SectionHeader icon={<IconExport />} title="Export" />
              <div className="space-y-2">
                <button
                  onClick={handleExportMosaic}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)]"
                  aria-label="Export color mosaic"
                >
                  <IconImage />
                  Mosaic Image
                </button>
                <button
                  onClick={handleExportPalette}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)]"
                  aria-label="Export color palette"
                >
                  <IconPaletteExport />
                  Palette
                </button>
                <button
                  onClick={handleExportTemplate}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)]"
                  aria-label="Export numbered template (300 DPI)"
                >
                  <IconDocument />
                  Line Art (300 DPI)
                </button>
                <button
                  onClick={handleExportColored}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)]"
                  aria-label="Export colored preview"
                >
                  <IconPalette />
                  Colored Preview
                </button>
                <button
                  onClick={handleExportNoNumber}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-[var(--bg-secondary)]"
                  aria-label="Export template without numbers"
                >
                  <IconDocument />
                  No Number (answer key)
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Export palette and template together for best results.
              </p>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
