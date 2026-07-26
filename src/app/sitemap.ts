import type { MetadataRoute } from "next";

const BASE = "https://www.kadoa.com/potus";

export default function sitemap(): MetadataRoute.Sitemap {
  // lastModified stamps "fresh today" for crawlers; the pages update on the
  // aggregator cadence so a per-build date is accurate enough.
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/schedule`, lastModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/truth`, lastModified, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE}/whitehouse`, lastModified, changeFrequency: "hourly", priority: 0.8 },
    { url: `${BASE}/about`, lastModified, changeFrequency: "monthly", priority: 0.5 },
  ];
}
