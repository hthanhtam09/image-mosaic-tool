"use client";

import { useColorByNumberStore } from "@/store/useColorByNumberStore";
import { useCallback, useRef, useState } from "react";
import type { ColorByNumberGridType } from "@/lib/colorByNumber";
import ProjectPreviewModal from "./ProjectPreviewModal";

export default function Dashboard() {
  const {
    projects,
    addProject,
    convertAllIdleProjects,
    updateProject,
    removeProject,
    setCellSize,
    toggleShowNumbers,
    togglePalette,
  } = useColorByNumberStore();

  const [previewProjectId, setPreviewProjectId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  /* ── Import Image (Batch) ── */
  const handleImportClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsImporting(true);

      try {
        // 1. Convert to array and Sort naturally (1, 2, 10...)
        const fileList = Array.from(files).sort((a, b) => 
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );

        // Pattern cycle: Square -> Circle -> Diamond -> Pentagon
        const patternCycle: ColorByNumberGridType[] = [
             "standard",  // 1: Square
             "honeycomb", // 2: Circle
             "diamond",   // 3: Diamond
             "pentagon"   // 4: Pentagon
        ];

        // Process sequentially to read files
        await Promise.all(fileList.map(async (file, index) => {
             const reader = new FileReader();
             const dataUrl = await new Promise<string>((resolve, reject) => {
               reader.onload = () => resolve(reader.result as string);
               reader.onerror = reject;
               reader.readAsDataURL(file);
             });

             // Calculate pattern based on index
             const pattern = patternCycle[index % patternCycle.length];

             // Add project with assigned pattern
             addProject(file, dataUrl, {
                gridType: pattern, 
             });
        }));

      } catch (err) {
        console.error("Failed to import images:", err);
      } finally {
        setIsImporting(false);
        e.target.value = "";
      }
    },
    [addProject],
  );

  const handleConvertAll = async () => {
      setIsConverting(true);
      await convertAllIdleProjects();
      setIsConverting(false);
  };

  const GRID_TYPES: { value: ColorByNumberGridType; label: string }[] = [
    { value: "standard", label: "Hình vuông" },
    { value: "honeycomb", label: "Hình tròn" },
    { value: "diamond", label: "Hình thoi" },
    { value: "pentagon", label: "Ngũ giác" },
  ];

  // Logic: 
  // If no projects -> Show Big Central Import Button
  // If projects -> Show Grid of Cards + Top/Bottom Actions

  if (projects.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center">
              <div className="mb-6 p-6 bg-[var(--bg-secondary)] rounded-full">
                  <span className="text-6xl">📷</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Start Your Project</h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                  Import images to create color-by-number templates. You can process multiple images at once.
              </p>
              <button
                onClick={handleImportClick}
                className="px-8 py-4 text-lg font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                  Import Images
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                multiple
                onChange={handleImageFileChange}
              />
          </div>
      );
  }

  const idleCount = projects.filter(p => p.status === 'idle').length;

  return (
    <div className="h-full flex flex-col p-8 overflow-hidden">
        {/* Header / Actions */}
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                Dashboard ({projects.length})
            </h1>
            <div className="flex gap-4">
                 <button
                    onClick={handleImportClick}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] border border-[var(--border-default)] rounded-lg hover:bg-white/5 transition-colors"
                >
                    + Add More
                </button>
                {idleCount > 0 && (
                    <button
                        onClick={handleConvertAll}
                        disabled={isConverting}
                        className="px-6 py-2 text-sm font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg shadow-sm transition-colors disabled:opacity-50"
                    >
                        {isConverting ? "Converting..." : `Convert All (${idleCount})`}
                    </button>
                )}
                 <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    multiple
                    onChange={handleImageFileChange}
                />
            </div>
        </div>

        {/* Grid of Project Cards */}
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 pb-8">
                {projects
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(project => (
                    <div 
                        key={project.id} 
                        className="flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                        {/* Image Preview / Status Overlay */}
                        <div className="relative w-full pt-[100%] bg-white/5 group border-b border-[var(--border-subtle)] overflow-hidden">
                            <img 
                                src={project.thumbnailDataUrl} 
                                alt={project.name} 
                                className="absolute inset-0 w-full h-full object-cover object-top"
                            />
                            
                            {/* Status Overlay */}
                            {project.status === 'idle' && (
                                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-yellow-500/80 text-white rounded backdrop-blur-sm">
                                    Pending
                                </div>
                            )}
                            {project.status === 'processing' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                    <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                             {project.status === 'completed' && (
                                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-green-500/80 text-white rounded backdrop-blur-sm">
                                    Ready
                                </div>
                            )}

                             {/* Hover Actions (Delete) */}
                             <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if(confirm('Delete this project?')) removeProject(project.id);
                                }}
                                className="absolute top-2 left-2 p-1.5 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded hover:bg-red-500/80 transition-all"
                                title="Delete"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                             </button>
                        </div>

                        {/* Controls */}
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-[var(--text-primary)] truncate" title={project.name}>
                                    {project.name}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    {project.status === 'completed' ? `${project.data?.cells.length} cells` : 'Not processed'}
                                </p>
                            </div>

                             {/* Settings (Only if not processing) */}
                             <div className="space-y-3">
                                {/* Pattern Type */}
                                <div>
                                    <label className="text-xs text-[var(--text-secondary)] block mb-1">Pattern Type</label>
                                    <select
                                        value={project.gridType}
                                        onChange={(e) => updateProject(project.id, { gridType: e.target.value as ColorByNumberGridType, status: 'idle' })}
                                        disabled={project.status === 'processing'}
                                        className="w-full text-sm bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                                    >
                                        {GRID_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Cell Size Slider */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs text-[var(--text-secondary)]">Cell Size</label>
                                        <span className="text-xs text-[var(--text-primary)] font-mono">{project.cellSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={10}
                                        max={100}
                                        step={1}
                                        value={project.cellSize}
                                        onChange={(e) => setCellSize(project.id, Number(e.target.value))}
                                        disabled={project.status === 'processing'}
                                        className="w-full"
                                    />
                                </div>

                                {/* Toggles */}
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={project.showNumbers}
                                            onChange={() => toggleShowNumbers(project.id)}
                                            className="rounded border-[var(--border-default)] bg-transparent text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs text-[var(--text-secondary)] select-none">Numbers</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={project.showPalette ?? true}
                                            onChange={() => togglePalette(project.id)}
                                            className="rounded border-[var(--border-default)] bg-transparent text-[var(--accent)] focus:ring-0 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs text-[var(--text-secondary)] select-none">Palette</span>
                                    </label>
                                </div>
                             </div>

                             {/* Action Button */}
                             {project.status === 'completed' ? (
                            <button
                                onClick={() => setPreviewProjectId(project.id)}
                                className="w-full py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent)]/10 hover:bg-[var(--accent)]/20 rounded-lg transition-colors border border-[var(--accent)]/20"
                            >
                                Open Preview
                            </button>
                             ) : (
                                <div className="h-9"></div> // Spacer to align cards
                             )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {previewProjectId && (
            <ProjectPreviewModal 
                projectId={previewProjectId} 
                onClose={() => setPreviewProjectId(null)} 
            />
        )}
    </div>
  );
}
