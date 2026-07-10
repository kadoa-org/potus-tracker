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
  const tab = tabs[(await params).tab as TabKey];

  if (!tab) {
    notFound();
  }

  const Component = tab.component;

  // Single full-width column. The alert CTA lives in the header (AlertModal),
  // not in the content flow, so there is no side-rail and nothing to reflow
  // while data loads.
  return <Component />;
}

export async function generateStaticParams() {
  return Object.keys(tabs).map((tab) => ({
    tab,
  }));
}

// Force dynamic rendering for all routes to avoid SSR issues with client components
export const dynamic = "force-dynamic";
