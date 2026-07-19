import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Feed } from "@/components/Feed";
import { Schedule } from "@/components/Schedule";
import { TruthSocial } from "@/components/TruthSocial";

const tabs = {
  whitehouse: {
    component: Feed,
    title: "White House News - Live Presidential Actions & Executive Orders",
    description:
      "Live feed of White House news, presidential actions, and executive orders. Updated in real time from official sources.",
  },
  truth: {
    component: TruthSocial,
    title: "Trump Truth Social Posts - Live Feed",
    description:
      "Every Truth Social post from the President as it happens. Real-time feed with timestamps, no login required.",
  },
  schedule: {
    component: Schedule,
    title: "President's Schedule Today - Daily Public Schedule",
    description:
      "The President's daily public schedule: meetings, travel, press events, and location, updated in real time.",
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

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }): Promise<Metadata> {
  const key = (await params).tab as TabKey;
  const tab = tabs[key];
  if (!tab) return {};
  const url = `https://www.kadoa.com/potus/${key}`;
  const title = `${tab.title} | POTUS Tracker`;
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
    creator: { "@type": "Organization", name: "Kadoa", url: "https://www.kadoa.com" },
  };

  // Single full-width column. The alert CTA lives in the header (AlertModal),
  // not in the content flow, so there is no side-rail and nothing to reflow
  // while data loads.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Component initial={initial} />
    </>
  );
}

export async function generateStaticParams() {
  return Object.keys(tabs).map((tab) => ({
    tab,
  }));
}

// Force dynamic rendering for all routes to avoid SSR issues with client components
export const dynamic = "force-dynamic";
