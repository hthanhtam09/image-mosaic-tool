import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Mosaic Tool - Professional Color-by-Number Generator",
  description:
    "Convert images into pixelated mosaics with quantized color palettes. Professional internal tool for creating color-by-number art.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
