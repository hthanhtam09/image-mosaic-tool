"use client";

import { ColorByNumberGridType, PartialColorMode, DirectImage } from "@/lib/colorByNumber";
import { Project } from "@/store/useColorByNumberStore";
import ProjectCard from "./ProjectCard";
import FolderProjectCard from "./FolderProjectCard";


interface ProjectGridProps {
    projects: Project[];
    directImages: DirectImage[];
    removeDirectImage: (name: string) => void;
    splitColorDropdownId: string | null;
    setSplitColorDropdownId: (id: string | null) => void;
    splitColorRef: React.RefObject<HTMLDivElement | null>;
    setPreviewProjectId: (id: string | null) => void;
    SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[];
    GRID_TYPES: { value: ColorByNumberGridType; label: string }[];
}

export default function ProjectGrid({
    projects,
    directImages,
    removeDirectImage,
    splitColorDropdownId,
    setSplitColorDropdownId,
    splitColorRef,
    setPreviewProjectId,
    SPLIT_COLOR_MODES,
    GRID_TYPES,
}: ProjectGridProps) {
    return (
        <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 pb-8">
                {/* Show direct folder upload cards */}
                {directImages.map(img => (
                    <FolderProjectCard
                        key={img.name}
                        img={img}
                        removeDirectImage={removeDirectImage}
                    />
                ))}

                {projects
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            splitColorDropdownId={splitColorDropdownId}
                            setSplitColorDropdownId={setSplitColorDropdownId}
                            splitColorRef={splitColorRef}
                            setPreviewProjectId={setPreviewProjectId}
                            SPLIT_COLOR_MODES={SPLIT_COLOR_MODES}
                            GRID_TYPES={GRID_TYPES}
                        />
                    ))}
            </div>
        </div>
    );
}
