import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feed } from "@/components/Feed";
import { Schedule } from "@/components/Schedule";
import { TruthSocial } from "@/components/TruthSocial";
import { cleanEventTitle } from "@/lib/schedule";

const tabs = {
  whitehouse: {
    component: Feed,
    title: "White House News Today - Presidential Actions & Executive Orders",
    description:
      "Today's White House news, presidential actions, and executive orders, each summarized and linked to the official release. Updated in real time.",
    dated: false,
  },
  truth: {
    component: TruthSocial,
    title: "What Did Trump Post Today? Truth Social Posts Ranked by Impact",
    description:
      "Every Trump Truth Social post as it happens, scored by real-world impact so you can skip the noise. See what actually matters, updated in real time.",
    dated: true,
  },
  schedule: {
    component: Schedule,
    title: "Trump Schedule Today - Live Daily Public Schedule",
    description:
      "Where is President Trump today? See his full daily public schedule hour by hour: meetings, travel, and events, updated live from official sources.",
    dated: true,
  },
} as const;

type TabKey = keyof typeof tabs;

// Server-fetch the tab's initial data from the public, edge-cached API so the
// page ships real content in its HTML (crawlable) instead of a "Loading…" shell.
// Returns undefined on any error → the client component just loads it the old
// way, so this can never make a page worse than before.
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.kadoa.com";

async function getInitial(key: TabKey) {
  try {
    if (key === "schedule") {
      const r = await fetch(`${SITE}/potus/api/schedule`, { cache: "no-store" });
      return r.ok ? (await r.json()).data : undefined;
    }
    const type = key === "truth" ? "truth_social" : "news";
    const r = await fetch(`${SITE}/potus/api/feed?page=1&limit=10&type=${type}`, { cache: "no-store" });
    return r.ok ? await r.json() : undefined;
  } catch {
    return undefined;
  }
}

// ET date label for freshness in titles (e.g. "Sat, Jul 25"), matching the
// homepage. Signals "updated today" to searchers scanning the SERP.
function todayLabelET() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const key = (await params).tab as TabKey;
  const tab = tabs[key];
  if (!tab) return {};
  const url = `https://www.kadoa.com/potus/${key}`;
  const title = tab.dated ? `${tab.title} (${todayLabelET()})` : `${tab.title} | POTUS Tracker`;
  return {
    title,
    description: tab.description,
    alternates: { canonical: url },
    openGraph: { url, title, description: tab.description },
    twitter: { title, description: tab.description },
  };
}

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const key = (await params).tab as TabKey;
  const tab = tabs[key];

  if (!tab) {
    notFound();
  }

  const Component = tab.component as (props: { initial?: unknown }) => ReturnType<typeof Feed>;
  const initial = await getInitial(key);

  // Dataset schema (matches the sibling trackers, which earned "Datasets" rich
  // results). This is an open dataset we present — not NewsArticle, which would
  // wrongly claim authorship of the external sources we aggregate.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: tab.title,
    description: tab.description,
    url: `https://www.kadoa.com/potus/${key}`,
    isAccessibleForFree: true,
    dateModified: new Date().toISOString(),
    creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
  };

  // For the schedule, also emit an ItemList of Events so search engines can read
  // the actual agenda (name/time/location) — the structured content competitors
  // rank with. Cap at 20 and skip date-only placeholder rows (midnight).
  const scheduleEvents = Array.isArray(initial) ? (initial as ScheduleRow[]) : [];
  const scheduleLd =
    key === "schedule" && scheduleEvents.length
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "President Trump's public schedule",
          itemListElement: scheduleEvents
            .filter((e) => e.time && !/T00:00:00/.test(e.time))
            .slice(0, 20)
            .map((e, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Event",
                name: cleanEventTitle(e.title),
                startDate: e.time,
                eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
                ...(e.locationStr ? { location: { "@type": "Place", name: e.locationStr } } : {}),
              },
            })),
        }
      : null;

  // Single full-width column. The alert CTA lives in the header (AlertModal),
  // not in the content flow, so there is no side-rail and nothing to reflow
  // while data loads.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {scheduleLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scheduleLd) }} />
      )}
      <Component initial={initial} />
    </>
  );
}

type ScheduleRow = { title?: string; time?: string; locationStr?: string };

export async function generateStaticParams() {
  return Object.keys(tabs).map((tab) => ({
    tab,
  }));
}

// Force dynamic rendering for all routes to avoid SSR issues with client components
export const dynamic = "force-dynamic";
