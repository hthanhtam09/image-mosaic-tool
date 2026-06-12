import type { ColorByNumberGridType } from "./types";

export interface PatternOption {
  id: ColorByNumberGridType;
  label: string;
}

// The selectable mosaic patterns (excludes the "Auto" cycle option, which is
// always available). Single source of truth shared by the tool's picker and
// the admin visibility controls.
export const PATTERNS: PatternOption[] = [
  { id: "standard", label: "Square" },
  { id: "honeycomb", label: "Circle" },
  { id: "diamond", label: "Diamond" },
  { id: "pentagon", label: "Hexagon" },
  { id: "puzzle", label: "Puzzle" },
  { id: "islamic", label: "Islamic" },
  { id: "fish-scale", label: "Fish Scale" },
  { id: "trapezoid", label: "Trapezoid" },
];
