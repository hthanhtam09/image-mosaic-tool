import type { Metadata } from "next";
import BlogClient from "./BlogClient";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides, tutorials and updates for coloring-book creators.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog · Mosaci",
    description: "Guides, tutorials and updates for coloring-book creators.",
    url: "/blog",
    type: "website",
  },
};

export default function BlogPage() {
  return <BlogClient />;
}
