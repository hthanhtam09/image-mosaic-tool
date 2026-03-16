"use client";

interface FolderProjectCardProps {
    img: { name: string; colorUrl: string; uncolorUrl: string };
    removeDirectImage: (name: string) => void;
}

export default function FolderProjectCard({
    img,
    removeDirectImage,
}: FolderProjectCardProps) {
    return (
        <div className="flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="relative w-full pt-[100%] bg-white/5 border-b border-[var(--border-subtle)] overflow-hidden">
                <img
                    src={img.colorUrl || img.uncolorUrl}
                    alt={img.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                />
                <div className="absolute top-2 right-2 px-2 py-1 text-[10px] font-bold bg-blue-500 text-white rounded uppercase tracking-wider shadow-sm">
                    Direct Folder
                </div>
                <button
                    onClick={() => removeDirectImage(img.name)}
                    className="absolute top-2 left-2 p-1.5 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded hover:bg-red-500/80 transition-all shadow-sm"
                    title="Remove"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-4">
                <h3 className="text-sm font-medium text-[var(--text-primary)] truncate" title={img.name}>
                    {img.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${img.colorUrl ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    {img.colorUrl ? 'Color included' : 'No color image'}
                </p>
            </div>
        </div>
    );
}
