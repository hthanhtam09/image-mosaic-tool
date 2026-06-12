"use client";

import { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import { useColorByNumberStore, Project } from "@/store/useColorByNumberStore";
import Image from "next/image";

interface ProjectCardProps {
  readonly project: Project;
  readonly splitColorRef: React.RefObject<HTMLDivElement | null>;
  readonly setPreviewProjectId: (id: string | null) => void;
  readonly SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[];
  readonly GRID_TYPES: { value: ColorByNumberGridType; label: string }[];
  readonly isConverting: boolean;
}

export default function ProjectCard({
  project,
  splitColorRef,
  setPreviewProjectId,
  SPLIT_COLOR_MODES,
  GRID_TYPES,
  isConverting,
}: ProjectCardProps) {
  const { updateProject, removeProject } = useColorByNumberStore();

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
    <div className="group/card relative flex flex-col overflow-hidden rounded-2xl border border-white/7 bg-[#1c1c1c] transition-all duration-200 hover:border-white/13 hover:shadow-xl hover:shadow-black/40">
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

        {/* Status pill — top right */}
        <div className="absolute right-3 top-3">
          {project.status === "idle" && (
            <span className="rounded-full border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold leading-none text-amber-300 backdrop-blur-sm">
              Pending
            </span>
          )}
          {isProcessing && (
            <span className="flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] font-semibold leading-none text-[var(--accent)] backdrop-blur-sm">
              <span className="h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />{"Converting"}
            </span>
          )}
          {isReady && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold leading-none text-emerald-300 backdrop-blur-sm">
              Ready
            </span>
          )}
          {isError && (
            <span className="rounded-full border border-red-400/30 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold leading-none text-red-300 backdrop-blur-sm">
              Error
            </span>
          )}
        </div>

        {/* Split badge */}
        {project.partialColorMode !== "none" && (
          <div className="absolute left-3 top-3">
            <span className="rounded-full border border-violet-400/30 bg-violet-500/20 px-2.5 py-1 text-[11px] font-semibold leading-none text-violet-300 backdrop-blur-sm">
              Split
            </span>
          </div>
        )}

        {/* Delete button — hover reveal top-left (only when no split badge) */}
        {project.partialColorMode === "none" && (
          <div className="absolute left-3 top-3 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isConverting) return;
                if (confirm(`Delete "${project.name}"?`)) removeProject(project.id);
              }}
              disabled={isConverting}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur-sm transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed"
              title="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Delete button when split badge is showing — show on hover below the badge */}
        {project.partialColorMode !== "none" && (
          <div className="absolute left-3 top-10 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isConverting) return;
                if (confirm(`Delete "${project.name}"?`)) removeProject(project.id);
              }}
              disabled={isConverting}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur-sm transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed"
              title="Delete"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Bottom overlay: name + preview button */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <div className="min-w-0">
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
          {isReady && (
            <button
              type="button"
              onClick={() => setPreviewProjectId(project.id)}
              disabled={isConverting}
              className="shrink-0 flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[12px] font-semibold text-white backdrop-blur-sm transition hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </button>
          )}
        </div>
      </div>

      {/* Controls — compact, below image */}
      <div className="flex gap-2 p-3" ref={splitColorRef}>
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
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80 outline-none transition hover:border-white/[0.15] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {gridTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80 outline-none transition hover:border-white/[0.15] focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {SPLIT_COLOR_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
