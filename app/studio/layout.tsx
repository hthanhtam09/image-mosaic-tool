import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mosaci Studio",
  description:
    "Convert images into color-by-number mosaics and export print-ready PDF coloring books.",
};

export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
