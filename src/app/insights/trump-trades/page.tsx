import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CsvDownload } from "@/components/CsvDownload";
import { ChanceRows, MonthlyTrades, PostTimeline } from "@/components/TradeCharts";
import { ChartCard, DataTable, SectionHeading } from "@/kit";
import { insightBySlug } from "@/lib/insights";
import data from "@/data/trump-trades.json";

// A static analysis, rebuilt by hand from the disclosures: Trump's trades against Congress, and his accounts' trades in
// the week before his posts about a company against the same posts moved to random dates.
const insight = insightBySlug("trump-trades")!;
const URL = "https://www.kadoa.com/potus/insights/trump-trades";

export const metadata: Metadata = {
  title: insight.seoTitle,
  description: insight.seoDescription,
  alternates: { canonical: URL },
  openGraph: { url: URL, title: insight.seoTitle, description: insight.seoDescription },
  twitter: { title: insight.seoTitle, description: insight.seoDescription },
};

type Month = { month: string; trump: number; congress: number };
type Event = { date: string; company: string; ticker: string; stance: string; buyDays: number[]; saleDays: number[]; match: boolean; text: string; url: string | null };

const fmt = (n: number) => n.toLocaleString("en-US");
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}`;
const tradesBefore = (e: Event) =>
  [...e.buyDays.map((d) => `bought ${-d}d`), ...e.saleDays.map((d) => `sold ${-d}d`)].join(", ") || "none";

export default function TrumpTradesPage() {
  const { totals, months, chance, examples } = data;
  const events = data.events as Event[];
  const ahead = totals.trump - totals.congress;
  return (
    <main className="pb-16">
      <Breadcrumbs items={[{ label: "Insights", href: "/insights" }, { label: insight.title }]} />
      <div className="title-block">
        <h1 className="dk-h1">{insight.title}</h1>
        <p className="lede">
          Trump&apos;s {totals.accounts} investment accounts made {fmt(totals.trump)} disclosed trades from January 2025 to August 2026,{" "}
          {fmt(ahead)} more than the {totals.members} members of Congress who traded, with their families. But in the week before he praised or
          attacked a company, the accounts traded its stock about as often as they would have on random dates.
        </p>
      </div>

      <div className="nights-card">
      <ChartCard
        id="months-title"
        title={`His accounts made more trades in ${totals.monthsAhead} of ${months.length} months`}
        description="Disclosed trades per month. August 2026 is faded because its filings may not all be in yet."
        date="January 2025 to August 2026"
        tabs={[
          { label: "Chart", content: <MonthlyTrades months={months} totals={totals} /> },
          {
            label: "Tabular data",
            short: "Tabular",
            scroll: true,
            content: (
              <DataTable
                rows={months}
                rowKey={(m: Month) => m.month}
                columns={[
                  { key: "month", header: "Month", render: (m: Month) => monthLabel(m.month) },
                  { key: "trump", header: "Trump's accounts", align: "right", render: (m: Month) => fmt(m.trump) },
                  { key: "congress", header: "Congress", align: "right", render: (m: Month) => fmt(m.congress) },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: (
              <CsvDownload
                intro="Disclosed trades per month as a CSV: Trump's accounts and all members of Congress."
                file="trump-congress-trades-by-month.csv"
                header={["month", "trump_accounts", "congress"]}
                rows={months.map((m: Month) => [m.month, m.trump, m.congress])}
              />
            ),
          },
        ]}
        footer={
          <p>
            Source: Trump&apos;s OGE financial disclosures (2026 annual report and periodic transaction reports); House and Senate periodic
            transaction reports, with amended filings counted once. Reported values: ${(totals.trumpLo / 1e9).toFixed(1)}B to $
            {(totals.trumpHi / 1e9).toFixed(1)}B for Trump&apos;s accounts, ${(totals.congressLo / 1e9).toFixed(1)}B to $
            {(totals.congressHi / 1e9).toFixed(1)}B for Congress.
          </p>
        }
      />

      </div>
      <div className="nights-card">
      <ChartCard
        id="chance-title"
        title="Their trades before his posts match random dates"
        description="Posts praising or attacking a company the accounts trade, and whether the accounts bought or sold its stock in the 7 days before."
        date="January 2025 to August 2026"
        tabs={[
          { label: "Chart", content: <ChanceRows chance={chance} /> },
          {
            label: "Tabular data",
            short: "Tabular",
            scroll: true,
            content: (
              <DataTable
                rows={events}
                rowKey={(e: Event) => `${e.ticker}-${e.date}-${e.stance}`}
                columns={[
                  { key: "date", header: "Date", render: (e: Event) => day(e.date) },
                  { key: "company", header: "Company", render: (e: Event) => e.company },
                  { key: "stance", header: "Post", hideBelow: "sm", render: (e: Event) => (e.stance === "praise" ? "Praise" : "Attack") },
                  { key: "trades", header: "Trades in the week before", render: (e: Event) => tradesBefore(e) },
                  { key: "text", header: "Text", hideBelow: "md", clamp: true, render: (e: Event) => (e.url ? <a href={e.url}>{e.text}</a> : e.text) },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: (
              <CsvDownload
                intro="Every post praising or attacking a company the accounts trade, with the days before the post on which they bought or sold its stock."
                file="trump-posts-and-trades.csv"
                header={["post_date", "company", "ticker", "stance", "bought_days_before", "sold_days_before", "post_url", "text"]}
                rows={events.map((e) => [e.date, e.company, e.ticker, e.stance, e.buyDays.map((d) => -d).join(" "), e.saleDays.map((d) => -d).join(" "), e.url ?? "", e.text])}
              />
            ),
          },
        ]}
        footer={
          <p>
            Random dates: each post moved to a random day between January 2025 and August 2026, 1,000 times; the range covers the middle 90% of
            runs. Media companies, such as Comcast and Disney, are excluded.
          </p>
        }
      />

      </div>
      <div className="nights-card">
        <ChartCard id="examples-title" title="Some posts came days after a trade in the same stock" description="A few that look timed. Across all posts, they are no more common than chance.">
          <PostTimeline examples={examples} />
        </ChartCard>
      </div>

      <section className="mt-10 max-w-[48rem]">
        <SectionHeading title="About the data" />
        <ul className="list-disc space-y-3 pl-5 text-[17px] leading-relaxed">
          <li>
            Trades come from Trump&apos;s filings with the Office of Government Ethics: the 2026 annual report, which lists 2025 trades not
            reported earlier, and every periodic transaction report through August 2026. We count each reported trade. Filings give value
            ranges, not exact amounts.
          </li>
          <li>
            The White House says outside managers run the accounts. The filings do not say who chose each trade, and most are small orders
            spread across hundreds of stocks on the same day.
          </li>
          <li>
            Posts are every Truth Social post in the period, from the trumpstruth.org archive. Gemini tagged each one for the listed companies
            it names and whether it praises or attacks them.
          </li>
          <li>
            A purchase counts for a post praising a company, and a sale for a post attacking one, when it falls 1 to 7 days before the post, in
            Eastern time.
          </li>
        </ul>
      </section>
    </main>
  );
}
