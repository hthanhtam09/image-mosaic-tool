"use client";

import { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import { useColorByNumberStore, Project } from "@/store/useColorByNumberStore";
import Image from "next/image";
import { memo } from "react";

interface ProjectCardProps {
  readonly project: Project;
  readonly splitColorRef: React.RefObject<HTMLDivElement | null>;
  readonly setPreviewProjectId: (id: string | null) => void;
  readonly SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[];
  readonly GRID_TYPES: { value: ColorByNumberGridType; label: string }[];
  readonly isConverting: boolean;
  readonly isSelected: boolean;
  readonly onToggleSelect: (id: string) => void;
}

function ProjectCard({
  project,
  splitColorRef,
  setPreviewProjectId,
  SPLIT_COLOR_MODES,
  GRID_TYPES,
  isConverting,
  isSelected,
  onToggleSelect,
}: ProjectCardProps) {
  const { updateProject, removeProject, convertSingleProject } = useColorByNumberStore();

  const isObjectFocus = project.removeBackground === true;
  const gridTypeOptions = isObjectFocus
    ? GRID_TYPES.filter((t) => t.value === "square-mark" || t.value === "hexagon-mark")
    : GRID_TYPES;

  const patternId = `pattern-${project.id}`;
  const splitId = `split-${project.id}`;

  const isProcessing = project.status === "processing";
  const isReady = project.status === "completed";
  const isError = project.status === "error";

  return (
    <div
      className="group/card relative flex flex-col overflow-hidden rounded-2xl border border-white/7 bg-[#1c1c1c] transition-all duration-200 hover:border-white/13 hover:shadow-xl hover:shadow-black/40 cursor-pointer"
      onClick={(e) => {
        if (isConverting) return;
        onToggleSelect(project.id);
      }}
    >
      {/* Thumbnail — tall, dominant */}
      <div className="relative aspect-3/4 overflow-hidden bg-[#111]">
        <Image
          src={project.thumbnailDataUrl}
          alt={project.name}
          fill
          unoptimized
          className="object-cover object-top transition-transform duration-500 group-hover/card:scale-105"
        />

        {/* Gradient veil — always present, stronger on hover */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

        {/* Checkbox for batch actions */}
        <div className="absolute left-3 top-3 z-20" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              onToggleSelect(project.id);
            }}
            disabled={isConverting}
            className="h-6 w-6 rounded-full border-2 border-white bg-black/40 checked:bg-[var(--accent)] checked:border-[var(--accent)] appearance-none cursor-pointer transition-all duration-200 flex items-center justify-center after:content-['✓'] after:text-[var(--bg-primary)] after:text-xs after:font-bold after:hidden checked:after:block shadow-md focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Split badge */}
        {project.partialColorMode !== "none" && (
          <div className="absolute left-11 top-3.5 z-10" onClick={(e) => e.stopPropagation()}>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold leading-none text-violet-300 backdrop-blur-md border border-violet-500/10 shadow-sm">
              Split
            </span>
          </div>
        )}

        {/* Delete button (x) — hover reveal top-right, replacing status badge */}
        <div className="absolute right-3 top-3 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 z-20" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isConverting) return;
              if (confirm(`Delete "${project.name}"?`)) removeProject(project.id);
            }}
            disabled={isConverting}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/80 border border-white/10 backdrop-blur-sm transition-all duration-200 hover:bg-red-500 hover:text-white hover:border-red-500/30 active:scale-90 shadow-md"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Bottom overlay: name + action button/badge */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 bg-linear-to-t from-black/90 via-black/40 to-transparent">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-white drop-shadow" title={project.name}>
              {project.name}
            </p>
            <p className="mt-0.5 text-[11px] text-white/50">
              {isReady
                ? `${project.data?.cells.length ?? 0} cells`
                : isError
                  ? "Failed"
                  : "Not converted"}
            </p>
          </div>

          <div className="shrink-0 flex items-center h-8" onClick={(e) => e.stopPropagation()}>
            {isReady && (
              <button
                type="button"
                onClick={() => setPreviewProjectId(project.id)}
                disabled={isConverting}
                className="flex h-8 items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 text-[12px] font-semibold text-white backdrop-blur-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </button>
            )}

            {project.status === "idle" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-amber-400 backdrop-blur-md border border-amber-500/10 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Pending
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-[var(--accent)] backdrop-blur-md border border-[var(--accent)]/10 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                Converting
              </span>
            )}
            {isError && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1.5 text-[10px] font-semibold leading-none text-red-400 backdrop-blur-md border border-red-500/10 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Error
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls — compact, below image */}
      <div className="flex flex-col gap-3 p-3.5" ref={splitColorRef} onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor={patternId} className="sr-only">Pattern</label>
            <select
              id={patternId}
              value={project.gridType}
              onChange={(e) =>
                updateProject(project.id, { gridType: e.target.value as ColorByNumberGridType, status: "idle" })
              }
              disabled={isProcessing || isConverting}
              title="Pattern type"
              style={{ colorScheme: 'dark' }}
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/80 outline-none transition hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 shadow-inner"
            >
              {gridTypeOptions.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#1c1c1c] text-white">{t.label}</option>
              ))}
            </select>
          </div>

          {!isObjectFocus && (
            <div className="flex-1 min-w-0">
              <label htmlFor={splitId} className="sr-only">Split color</label>
              <select
                id={splitId}
                value={project.partialColorMode}
                onChange={(e) =>
                  updateProject(project.id, { partialColorMode: e.target.value as PartialColorMode, status: "idle" })
                }
                disabled={isProcessing || isConverting}
                title="Split color mode"
                style={{ colorScheme: 'dark' }}
                className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] text-white/80 outline-none transition hover:border-white/[0.12] hover:bg-white/[0.04] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 shadow-inner"
              >
                {SPLIT_COLOR_MODES.map((m) => (
                  <option key={m.value} value={m.value} className="bg-[#1c1c1c] text-white">{m.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Convert button at the bottom of the card */}
        {(project.status === "idle" || isError || isProcessing) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isConverting || isProcessing) return;
              convertSingleProject(project.id);
            }}
            disabled={isConverting || isProcessing}
            className="w-full flex h-9.5 items-center justify-center rounded-xl bg-[var(--accent)] text-[12px] font-bold text-[var(--bg-primary)] transition hover:bg-[var(--accent-hover)] active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 shadow-md"
          >
            {isProcessing ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Converting...</span>
              </div>
            ) : (
              "Convert"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(ProjectCard);
