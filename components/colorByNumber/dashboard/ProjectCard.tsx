"use client";

import { ColorByNumberGridType, PartialColorMode } from "@/lib/colorByNumber";
import { useColorByNumberStore, Project } from "@/store/useColorByNumberStore";
import Image from "next/image";


interface ProjectCardProps {
    project: Project;
    splitColorDropdownId: string | null;
    setSplitColorDropdownId: (id: string | null) => void;
    splitColorRef: React.RefObject<HTMLDivElement | null>;
    setPreviewProjectId: (id: string | null) => void;
    SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[];
    GRID_TYPES: { value: ColorByNumberGridType; label: string }[];
}

export default function ProjectCard({
    project,
    splitColorDropdownId,
    splitColorRef,
    setPreviewProjectId,
    SPLIT_COLOR_MODES,
    GRID_TYPES,
}: ProjectCardProps) {
    const { updateProject, removeProject } = useColorByNumberStore();

    return (
        <div
            className="flex flex-col bg-(--bg-secondary) border border-(--border-subtle) rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
            {/* Image Preview / Status Overlay */}
            <div className="relative w-full pt-[100%] bg-white/5 group border-b border-(--border-subtle) overflow-hidden">
                <Image
                    src={project.thumbnailDataUrl}
                    alt={project.name}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    fill

                />

                {/* Status Overlay */}
                {project.status === 'idle' && (
                    <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-yellow-500/80 text-white rounded backdrop-blur-sm">
                        Pending
                    </div>
                )}
                {project.status === 'processing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="w-8 h-8 border-4 border-(--accent) border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {project.status === 'completed' && (
                    <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-green-500/80 text-white rounded backdrop-blur-sm">
                        Ready
                    </div>
                )}

                {/* Split Color Badge */}
                {project.partialColorMode !== 'none' && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-purple-500/80 text-white rounded backdrop-blur-sm">
                        {SPLIT_COLOR_MODES.find(m => m.value === project.partialColorMode)?.icon} Split
                    </div>
                )}

                {/* Hover Actions (Delete) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this project?')) removeProject(project.id);
                    }}
                    className="absolute top-2 left-2 p-1.5 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded hover:bg-red-500/80 transition-all"
                    title="Delete"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Controls */}
            <div className="p-4 space-y-4">
                <div>
                    <h3 className="text-sm font-medium text-(--text-primary) truncate" title={project.name}>
                        {project.name}
                    </h3>
                    <p className="text-xs text-(--text-secondary) mt-0.5">
                        {project.status === 'completed' ? `${project.data?.cells.length} cells` : 'Not processed'}
                    </p>
                </div>

                {/* Settings (Only if not processing) */}
                <div className="space-y-3">
                    {/* Pattern Type */}
                    <div>
                        <label className="text-xs text-(--text-secondary) block mb-1">Pattern Type</label>
                        <select
                            value={project.gridType}
                            onChange={(e) => updateProject(project.id, { gridType: e.target.value as ColorByNumberGridType, status: 'idle' })}
                            disabled={project.status === 'processing'}
                            className="w-full text-sm bg-(--bg-primary) border border-(--border-default) rounded-lg px-2 py-1.5 text-(--text-primary) focus:outline-none focus:border-(--accent)"
                        >
                            {GRID_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Split Color Mode */}
                    <div className="relative" ref={splitColorDropdownId === project.id ? splitColorRef : undefined}>
                        <label className="text-xs text-(--text-secondary) block mb-1">Split Color</label>
                        <div className="flex items-center gap-2">
                            <select
                                value={project.partialColorMode}
                                onChange={(e) => updateProject(project.id, { partialColorMode: e.target.value as PartialColorMode, status: 'idle' })}
                                disabled={project.status === 'processing'}
                                className="flex-1 text-sm bg-(--bg-primary) border border-(--border-default) rounded-lg px-2 py-1.5 text-(--text-primary) focus:outline-none focus:border-(--accent)"
                            >
                                {SPLIT_COLOR_MODES.map(m => (
                                    <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {project.status === 'completed' ? (
                    <button
                        onClick={() => setPreviewProjectId(project.id)}
                        className="w-full py-2 text-sm font-medium text-(--accent) bg-(--accent)/10 hover:bg-(--accent)/20 rounded-lg transition-colors border border-(--accent)/20"
                    >
                        Open Preview
                    </button>
                ) : (
                    <div className="h-9"></div> // Spacer to align cards
                )}
            </div>
        </div>
    );
}
