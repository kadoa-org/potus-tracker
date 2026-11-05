import type { Metadata } from "next";
import { CsvDownload } from "@/components/CsvDownload";
import { MonthlyTrades, TopStocks } from "@/components/TradeCharts";
import { ChartCard, DataTable, SectionHeading } from "@/kit";
import { insightBySlug } from "@/lib/insights";
import data from "@/data/trump-trades.json";

// A static analysis, rebuilt by hand from the disclosures: Trump's trades against Congress, and the stocks his accounts
// traded most. The data is built in the datasets repo (services/custom/datasets/trump-trades).
const insight = insightBySlug("trump-trades")!;
const URL = "https://www.kadoa.com/potus/insights/trump-trades";
const OGE = "https://www.oge.gov/Web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm";
const HOUSE = "https://disclosures-clerk.house.gov/FinancialDisclosure";
const SENATE = "https://efdsearch.senate.gov/search/";

// Made by scripts/og-insights.mjs (npm run og) and committed, since Vercel builds have no Chrome.
const OG_IMAGE = { url: "https://www.kadoa.com/potus/og/trump-trades.png", width: 1200, height: 630 };

export const metadata: Metadata = {
  title: insight.seoTitle,
  description: insight.seoDescription,
  alternates: { canonical: URL },
  openGraph: { url: URL, title: insight.seoTitle, description: insight.seoDescription, images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: insight.seoTitle, description: insight.seoDescription, images: [OG_IMAGE.url] },
};

type Month = { month: string; trump: number; congress: number };
type Stock = { ticker: string; company: string; buy: number; sell: number };

const fmt = (n: number) => n.toLocaleString("en-US");
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (m: string) => `${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}`;

export default function TrumpTradesPage() {
  const { totals, months, mix } = data;
  const ahead = totals.trump - totals.congress;
  return (
    <main>
      <div className="title-block">
        <h1 className="dk-h1">{insight.title}</h1>
        <p className="lede">
          Trump&apos;s {totals.accounts} investment accounts made {fmt(totals.trump)} disclosed trades from January 2025 to August 2026,{" "}
          {fmt(ahead)} more than the {totals.members} members of Congress who traded, with their families. Most were stocks in big
          companies, spread across hundreds of names.
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
            Source: <a className="dk-link" href={OGE}>Trump&apos;s OGE financial disclosures</a>; <a className="dk-link" href={HOUSE}>House</a> and <a className="dk-link" href={SENATE}>Senate</a> periodic
            transaction reports.
          </p>
        }
      />

      </div>
      <div className="nights-card">
        <ChartCard
          id="stocks-title"
          title="Stocks traded by Trump's accounts"
          description={`${fmt(mix.stockTickers)} stocks, none traded more than ${mix.top[0].buy + mix.top[0].sell} times. The chart shows the 10 most traded; the table lists them all. Outside managers run the accounts, the White House says.`}
          date={`${monthLabel(mix.from)} to ${monthLabel(mix.to)}`}
          tabs={[
            { label: "Chart", content: <TopStocks top={mix.top} /> },
            {
              label: "Tabular data",
              short: "Tabular",
              scroll: true,
              content: (
                <DataTable
                  rows={mix.all}
                  rowKey={(r: Stock) => r.ticker}
                  columns={[
                    { key: "company", header: "Company", render: (r: Stock) => r.company },
                    { key: "ticker", header: "Ticker", render: (r: Stock) => r.ticker },
                    { key: "buy", header: "Purchases", align: "right", render: (r: Stock) => fmt(r.buy) },
                    { key: "sell", header: "Sales", align: "right", render: (r: Stock) => fmt(r.sell) },
                  ]}
                />
              ),
            },
            {
              label: "Download",
              content: (
                <CsvDownload
                  intro="Every stock the accounts traded as a CSV, with purchases and sales."
                  file="trump-stocks-traded.csv"
                  header={["company", "ticker", "purchases", "sales"]}
                  rows={mix.all.map((r: Stock) => [r.company, r.ticker, r.buy, r.sell])}
                />
              ),
            },
          ]}
          footer={
            <p>
              Source: <a className="dk-link" href={OGE}>Trump&apos;s OGE periodic transaction reports</a>.
            </p>
          }
        />
      </div>

      <section className="insight-notes">
        <SectionHeading title="About the data" />
        <ul>
          <li>
            Trades come from Trump&apos;s filings with the Office of Government Ethics: the 2026 annual report, which lists 2025 trades not
            reported earlier, and every periodic transaction report through August 2026. We count each reported trade. Filings give value
            ranges, not exact amounts.
          </li>
          <li>
            Congress trades come from House and Senate periodic transaction reports, with amended filings counted once.
          </li>
          <li>
            Reported values: ${(totals.trumpLo / 1e9).toFixed(1)}B to ${(totals.trumpHi / 1e9).toFixed(1)}B for Trump&apos;s accounts, $
            {(totals.congressLo / 1e9).toFixed(1)}B to ${(totals.congressHi / 1e9).toFixed(1)}B for Congress.
          </li>
          <li>
            The White House says outside managers run the accounts. The filings do not say who chose each trade, and most are small orders
            spread across hundreds of stocks on the same day.
          </li>
          <li>
            The stocks cover January to May 2026, the latest months whose periodic reports are complete. Trades without a ticker, such as
            bonds, are left out. Company names are cleaned from the filings.
          </li>
        </ul>
      </section>
    </main>
  );
}
