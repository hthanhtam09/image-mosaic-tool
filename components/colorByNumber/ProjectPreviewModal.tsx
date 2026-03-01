"use client";

import { useColorByNumberStore, useActiveProject } from "@/store/useColorByNumberStore";
import { useEffect, useRef, useState } from "react";
import ColorByNumberGrid from "./ColorByNumberGrid";
import { exportToCanvas } from "@/lib/colorByNumber";

interface ProjectPreviewModalProps {
  projectId: string;
  onClose: () => void;
}

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string): void => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

export default function ProjectPreviewModal({ projectId, onClose }: ProjectPreviewModalProps) {
  const { 
      setActiveProject, 
      setZoom, 
      setPan, 
      removeProject,
      activeProjectId
  } = useColorByNumberStore();

  // Set active project on mount if not already
  useEffect(() => {
      setActiveProject(projectId);
      // Reset view
      setZoom(1);
      setPan(0, 0);
      return () => setActiveProject(null); // Cleanup on close
  }, [projectId, setActiveProject, setZoom, setPan]);

  const activeProject = useActiveProject(); // Should be the project we just set
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });

  // Handle Resize for Grid
  useEffect(() => {
      if (!modalContentRef.current) return;
      
      const updateSize = () => {
          if (modalContentRef.current) {
               const { clientWidth, clientHeight } = modalContentRef.current;
               setViewportSize({ width: clientWidth, height: clientHeight });
          }
      };

      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!activeProject || !activeProject.data) return null;

  /* ── Zoom Controls ── */
  const handleZoomIn = () => setZoom(activeProject.zoom + 0.25);
  const handleZoomOut = () => setZoom(activeProject.zoom - 0.25);
  const handleResetZoom = () => { setZoom(1); setPan(0, 0); };

  const handleDownloadBoth = () => {
      if (!activeProject.data) return;

      const getBaseName = (name: string) => name.replace(/\.[^/.]+$/, "");
      const baseName = getBaseName(activeProject.name);
      
      // Colored
      const canvas1 = exportToCanvas(activeProject.data, activeProject.filled, {
          showCodes: activeProject.showNumbers,
          colored: true,
          showPalette: activeProject.showPalette ?? true,
          coloredRatio: activeProject.partialColor ? 0.75 : 1,
      });
      downloadCanvas(canvas1, `colored-${baseName}.png`);

      // Uncolored
      setTimeout(() => {
          const canvas2 = exportToCanvas(activeProject.data!, activeProject.filled, {
              showCodes: activeProject.showNumbers,
              colored: false,
              showPalette: activeProject.showPalette ?? true,
          });
          downloadCanvas(canvas2, `uncolored-${baseName}.png`);
      }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="relative flex flex-col w-full max-w-6xl h-[90vh] bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{activeProject.name}</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                        {activeProject.gridType} • {activeProject.cellSize}px • {activeProject.zoom * 100}%
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                 {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-[var(--bg-primary)] rounded-lg p-1 border border-[var(--border-default)]">
                     <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 text-lg">−</button>
                     <button onClick={handleResetZoom} className="px-2 text-xs font-mono">{Math.round(activeProject.zoom * 100)}%</button>
                     <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center rounded hover:bg-black/5 text-lg">+</button>
                </div>

                <button 
                    onClick={onClose}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/5 transition-colors"
                    title="Close"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
            </div>
        </div>

        {/* Content: The Grid */}
        <div 
            ref={modalContentRef}
            className="flex-1 overflow-hidden bg-[var(--bg-primary)] relative"
        >
             <ColorByNumberGrid 
                width={viewportSize.width} 
                height={viewportSize.height}
             />
             
         
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
             <button
                onClick={() => {
                    if(confirm("Delete this project?")) {
                        removeProject(projectId);
                        onClose();
                    }
                }}
                className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
             >
                Delete
             </button>
             
             <div className="flex items-center gap-3">
                 <button
                    onClick={handleDownloadBoth}
                    className="px-6 py-2 text-sm font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg transition-colors shadow-sm"
                 >
                    Download Both (Zip/Seq)
                 </button>
             </div>
        </div>
      </div>
    </div>
  );
}

