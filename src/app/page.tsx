import type { Metadata } from "next";
import { Today } from "@/components/Today";

// The "Today" dashboard is the front door: one page answering "where is the
// president / what's on today" with the schedule, Truth Social signal, location,
// and White House news at a glance. Date-stamped title for freshness + the top
// query family ("president schedule today", "where is trump today").
const todayLabel = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(new Date());

export const metadata: Metadata = {
  title: `Where is the President Today? Live Location & Schedule (${todayLabel})`,
  description:
    "Where is President Trump right now, what is on his schedule today, and what has he just said? Live location, public schedule, and Truth Social posts scored by relevance, updated in real time.",
  alternates: { canonical: "https://www.kadoa.com/potus" },
};

export const dynamic = "force-dynamic";

// Server-fetch the dashboard's data from the public, edge-cached APIs (the same
// ones the deep pages use) so the homepage ships real content in its HTML
// instead of an empty shell. Any failure degrades to an empty section rather
// than breaking the page.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.kadoa.com";

async function getData() {
  const base = `${SITE}/potus/api`;
  const j = async (path: string, fallback: unknown) => {
    try {
      const r = await fetch(`${base}${path}`, { cache: "no-store" });
      return r.ok ? await r.json() : fallback;
    } catch {
      return fallback;
    }
  };
  const [loc, sch, tru, nws] = await Promise.all([
    j("/location", { data: null }),
    j("/schedule", { data: [] }),
    j("/feed?type=truth_social&limit=20", { data: [] }),
    j("/feed?type=news&limit=3", { data: [] }),
  ]);
  return { location: loc.data, schedule: sch.data ?? [], truth: tru.data ?? [], news: nws.data ?? [] };
}

export default async function Page() {
  const initial = await getData();
  return <Today initial={initial} />;
}
