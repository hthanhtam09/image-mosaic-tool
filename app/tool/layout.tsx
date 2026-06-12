import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mosaci — Coloring Book Generator",
  description:
    "Convert images into color-by-number mosaics and export print-ready PDF coloring books.",
};

export default function ToolLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
