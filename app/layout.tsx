import PageLoader from '@/components/PageLoader'
import QueryProvider from '@/components/QueryProvider'
import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mosaci.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mosaci — Turn any image into a color-by-number book",
    template: "%s · Mosaci",
  },
  description:
    "Upload, pick a mosaic style, export a print-ready PDF coloring book. Built for KDP creators.",
  applicationName: "Mosaci",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "Mosaci",
    url: siteUrl,
    title: "Mosaci — Turn any image into a color-by-number book",
    description:
      "Upload, pick a mosaic style, export a print-ready PDF coloring book. Built for KDP creators.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mosaci — Turn any image into a color-by-number book",
    description:
      "Upload, pick a mosaic style, export a print-ready PDF coloring book. Built for KDP creators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          <PageLoader />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
