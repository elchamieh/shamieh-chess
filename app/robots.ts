import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/tournaments"],
      disallow: ["/login", "/register", "/portal", "/forgot-password", "/reset-password", "/auth/"],
    },
    sitemap: "https://www.shamiehchess.com/sitemap.xml",
    host: "https://www.shamiehchess.com",
  };
}
