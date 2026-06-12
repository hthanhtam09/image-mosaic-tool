"use client";

interface FolderProjectCardProps {
  readonly img: { name: string; colorUrl: string; uncolorUrl: string };
  readonly removeDirectImage: (name: string) => void;
  readonly isConverting: boolean;
}

export default function FolderProjectCard({
  img,
  removeDirectImage,
  isConverting,
}: FolderProjectCardProps) {
  return (
    <div className="group/card relative flex flex-col overflow-hidden rounded-2xl border border-white/7 bg-[#1c1c1c] transition-all duration-200 hover:border-white/13 hover:shadow-xl hover:shadow-black/40">
      <div className="relative aspect-3/4 overflow-hidden bg-[#111]">
        <img
          src={img.colorUrl || img.uncolorUrl}
          alt={img.name}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover/card:scale-105"
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

        {/* Badge */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 text-[11px] font-semibold leading-none text-sky-300 backdrop-blur-sm">
            Folder
          </span>
        </div>

        {/* Delete */}
        <div className="absolute left-3 top-3 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
          <button
            type="button"
            onClick={() => { if (!isConverting) removeDirectImage(img.name) }}
            disabled={isConverting}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur-sm transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed"
            title="Remove"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Name */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate text-[13px] font-semibold leading-tight text-white drop-shadow" title={img.name}>
            {img.name}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
            <span className={`h-1.5 w-1.5 rounded-full ${img.colorUrl ? "bg-emerald-400" : "bg-white/30"}`} />
            {img.colorUrl ? "Color included" : "Uncolor only"}
          </p>
        </div>
      </div>
    </div>
  );
}
