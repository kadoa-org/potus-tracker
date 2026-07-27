import type { Metadata } from "next";
import { Today } from "@/components/Today";
import { cleanEventTitle } from "@/lib/schedule";

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
    // Filtered server-side to the posts the panel actually shows. Fetching the
    // newest 20 unfiltered and dropping "low" on the client left the panel
    // empty whenever a run of reposts filled the window.
    j("/feed?type=truth_social&signal=high,medium&limit=5", { data: [] }),
    j("/feed?type=news&limit=3", { data: [] }),
  ]);
  return { location: loc.data, schedule: sch.data ?? [], truth: tru.data ?? [], news: nws.data ?? [] };
}

// FAQ schema targeting the highest-intent queries ("where is trump right now",
// "what is on trump's schedule today") with a direct answer built from live
// data. This is what earns the featured snippet and fixes the near-zero CTR on
// location queries where we already rank in the top 3.
type Loc = { locationName?: string } | null;
type SchedEvent = { title?: string; time?: string; locationStr?: string };

function buildFaq(location: Loc, schedule: SchedEvent[]) {
  const where = location?.locationName
    ? `President Trump is at ${location.locationName}.`
    : "President Trump's current location is updated live from his official public schedule.";

  const now = Date.now();
  const next = [...schedule]
    .filter((e) => e.time && new Date(e.time).getTime() >= now)
    .sort((a, b) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime())[0];
  const scheduleAnswer = next
    ? `Next up: ${cleanEventTitle(next.title)}${next.locationStr ? ` at ${next.locationStr}` : ""}. See the full public schedule for today, updated live.`
    : "See President Trump's full daily public schedule, updated live from official sources.";

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Where is President Trump right now?",
        acceptedAnswer: { "@type": "Answer", text: where },
      },
      {
        "@type": "Question",
        name: "What is on President Trump's schedule today?",
        acceptedAnswer: { "@type": "Answer", text: scheduleAnswer },
      },
    ],
  };
}

export default async function Page() {
  const initial = await getData();
  const faqLd = buildFaq(initial.location, initial.schedule);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Today initial={initial} />
    </>
  );
}
