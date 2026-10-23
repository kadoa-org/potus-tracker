import type { Metadata } from "next";
import Link from "next/link";
import { INSIGHTS } from "@/lib/insights";

const URL = "https://www.kadoa.com/potus/insights";
const TITLE = "Insights | POTUS Tracker";
const DESCRIPTION = "Analysis built on President Trump's public schedule, posts and financial disclosures.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { url: URL, title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

// The index of insight pages, one card each, in the layout of the Congress Trading Monitor and Energy Price Monitor.
export default function InsightsPage() {
  return (
    <main>
      <div className="title-block">
        <h1 className="dk-h1">Insights</h1>
        <p className="lede">Analysis built on the President&apos;s public schedule, posts and financial disclosures. Each one has its own page to link to.</p>
      </div>
      <ul className="insight-cards">
        {INSIGHTS.map((i) => (
          <li key={i.slug} className="insight-card">
            <h2 className="insight-card__title">
              <Link href={`/insights/${i.slug}`}>{i.title}</Link>
            </h2>
            <p className="insight-card__desc">{i.summary}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
