import type { Metadata } from "next";
import ArticleClient from "./ArticleClient";

const description =
  "A full walkthrough of the Mosaci workflow — choosing styles, tuning palettes, and assembling a print-ready PDF that passes KDP's checks.";

export function generateStaticParams() {
  return [{ slug: "from-stock-photo-to-kdp-book" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = "From stock photo to a 100-page KDP coloring book in one afternoon";
  return {
    title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: `${title} · Mosaci`,
      description,
      url: `/blog/${slug}`,
    },
  };
}

export default function ArticlePage() {
  return <ArticleClient />;
}
