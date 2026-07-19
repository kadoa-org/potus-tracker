import type { MetadataRoute } from "next";

const BASE = "https://www.kadoa.com/potus";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/whitehouse`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/truth`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/schedule`, changeFrequency: "daily", priority: 0.9 },
  ];
}
