"use client";

import { useEffect, useRef } from "react";
import { drawPBN } from "@/lib/paintByNumbers/drawPBN";
import type { PBNViewMode } from "@/store/usePaintByNumbersStore";

interface CanvasRendererProps {
  width: number;
  height: number;
  palette: [number, number, number][];
  pixelColorIndex: Uint8Array;
  regionMap: Int32Array;
  regions: { id: number; colorIndex: number; pixelCount: number; centroidX: number; centroidY: number }[];
  outlineThickness: number;
  fontSize: number;
  viewMode: PBNViewMode;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function CanvasRenderer({
  width,
  height,
  palette,
  pixelColorIndex,
  regionMap,
  regions,
  outlineThickness,
  fontSize,
  viewMode,
  canvasRef,
}: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    drawPBN(canvas, {
      width,
      height,
      palette,
      pixelColorIndex,
      regionMap,
      regions,
      outlineThickness,
      fontSize,
      showColorPreview: viewMode === "preview",
    });
  }, [width, height, palette, pixelColorIndex, regionMap, regions, outlineThickness, fontSize, viewMode, canvasRef]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center overflow-auto bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
    >
      {/* Checkerboard pattern for transparency */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #888 25%, transparent 25%),
            linear-gradient(-45deg, #888 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #888 75%),
            linear-gradient(-45deg, transparent 75%, #888 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full max-h-full object-contain shadow-2xl"
        style={{
          imageRendering: "auto",
        }}
      />
    </div>
  );
}
