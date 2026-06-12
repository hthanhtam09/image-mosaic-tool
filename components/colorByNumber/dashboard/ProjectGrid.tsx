"use client";

import { ColorByNumberGridType, PartialColorMode, DirectImage } from "@/lib/colorByNumber";
import { Project } from "@/store/useColorByNumberStore";
import ProjectCard from "./ProjectCard";
import FolderProjectCard from "./FolderProjectCard";

interface ProjectGridProps {
  readonly projects: Project[];
  readonly directImages: DirectImage[];
  readonly removeDirectImage: (name: string) => void;
  readonly splitColorRef: React.RefObject<HTMLDivElement | null>;
  readonly setPreviewProjectId: (id: string | null) => void;
  readonly SPLIT_COLOR_MODES: { value: PartialColorMode; label: string; icon: string }[];
  readonly GRID_TYPES: { value: ColorByNumberGridType; label: string }[];
  readonly isConverting: boolean;
}

export default function ProjectGrid({
  projects,
  directImages,
  removeDirectImage,
  splitColorRef,
  setPreviewProjectId,
  SPLIT_COLOR_MODES,
  GRID_TYPES,
  isConverting,
}: ProjectGridProps) {
  return (
    <div id="projects" className="flex-1 overflow-y-auto pr-2 no-scrollbar">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 pb-8">
        {directImages.map((img) => (
          <FolderProjectCard
            key={img.name}
            img={img}
            removeDirectImage={removeDirectImage}
            isConverting={isConverting}
          />
        ))}
        {projects
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
          .map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              splitColorRef={splitColorRef}
              setPreviewProjectId={setPreviewProjectId}
              SPLIT_COLOR_MODES={SPLIT_COLOR_MODES}
              GRID_TYPES={GRID_TYPES}
              isConverting={isConverting}
            />
          ))}
      </div>
    </div>
  );
}
