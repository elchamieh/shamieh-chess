import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.shamiehchess.com";
  return [
    {
      url: base,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/tournaments`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
