import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mosaci.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/pricing", priority: 0.8 },
    { path: "/blog", priority: 0.7 },
    { path: "/blog/from-stock-photo-to-kdp-book", priority: 0.6 },
    { path: "/login", priority: 0.3 },
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
