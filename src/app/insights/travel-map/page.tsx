import type { Metadata } from "next";
import { CsvDownload } from "@/components/CsvDownload";
import { TravelGlobe } from "@/components/TravelGlobe";
import { ChartCard, DataTable, SectionHeading } from "@/kit";
import { insightBySlug } from "@/lib/insights";
import { NightsGrid } from "@/components/NightsGrid";
import { CATEGORIES, km, nightsByCategory, placeHistory } from "@/lib/travel";
import { COLORS } from "@/lib/travelColors";
import { globeData, loadCurrentLocation, loadTravel } from "@/lib/travelData";

// Rebuilt from the schedule every six hours; the map and the calendar cover the last 365 complete nights.
export const revalidate = 21600;

const insight = insightBySlug("travel-map")!;
const URL = "https://www.kadoa.com/potus/insights/travel-map";
const FACTBASE = "https://rollcall.com/factbase/trump/topic/calendar/";

export const metadata: Metadata = {
  title: insight.seoTitle,
  description: insight.seoDescription,
  alternates: { canonical: URL },
  openGraph: { url: URL, title: insight.seoTitle, description: insight.seoDescription },
  twitter: { title: insight.seoTitle, description: insight.seoDescription },
};

const day = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const MILES = 1.609;

type Place = { id: number; label: string; name: string; category: string; nights: number };
type Key = keyof typeof COLORS;
type Flight = { key: string; date: string; from: string; to: string; miles: number };

// One insight on its own page, laid out like the sibling sites: title and lede, a chart card each for his flights and
// his nights, with Chart, Tabular data and Download tabs and a source line, then "About the data".
export default async function TravelMapPage() {
  const [travel, now] = await Promise.all([loadTravel(), loadCurrentLocation().catch(() => null)]);
  const history = placeHistory(travel);
  const flights: Flight[] = travel.flights
    .map((f: { from: number; to: number; date: string }, i: number) => ({
      key: `${f.date}-${i}`,
      date: f.date,
      from: travel.places[f.from].label,
      to: travel.places[f.to].label,
      miles: Math.round(km(travel.places[f.from], travel.places[f.to]) / MILES),
    }))
    .reverse();
  const miles = Math.round(travel.totalKm / MILES);
  const byCategory = nightsByCategory(travel);
  const total = travel.calendar.length;
  const label = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const shown = CATEGORIES.filter((c) => byCategory[c.key] > 0);
  const places: Place[] = travel.places
    .filter((p: Place) => p.nights > 0)
    .sort((a: Place, b: Place) => b.nights - a.nights || a.label.localeCompare(b.label));
  const owned = byCategory.maralago + byCategory.bedminster + byCategory.property;

  return (
    <main className="pb-16">
      <div className="title-block">
        <h1 className="dk-h1">{insight.title}</h1>
        <p className="lede">
          {flights.length} flights in the past year, {miles.toLocaleString("en-US")} miles in straight lines between his stops. Of {total} nights, he spent{" "}
          {byCategory.washington} in Washington and {owned} at his own properties.
        </p>
      </div>
      <ChartCard
        id="flights-title"
        title="Flights between stops"
        date={`${day(travel.from)} to ${day(travel.to)}`}
        tabs={[
          {
            label: "Chart",
            content: (
              <div className="mx-auto w-full max-w-[760px]">
                <TravelGlobe {...globeData(travel, history)} now={now} />
              </div>
            ),
          },
          {
            label: "Tabular data",
            short: "Tabular",
            scroll: true,
            content: (
              <DataTable
                rows={flights}
                rowKey={(f: Flight) => f.key}
                columns={[
                  { key: "date", header: "Date", render: (f: Flight) => day(f.date) },
                  { key: "from", header: "From", render: (f: Flight) => f.from },
                  { key: "to", header: "To", render: (f: Flight) => f.to },
                  { key: "miles", header: "Miles", align: "right", hideBelow: "sm", render: (f: Flight) => f.miles.toLocaleString("en-US") },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: (
              <CsvDownload
                intro="Every flight of the past year as a CSV: date, where it left from, where it landed and the straight-line miles."
                file="trump-flights.csv"
                header={["date", "from", "to", "miles"]}
                rows={flights.map((f) => [f.date, f.from, f.to, f.miles])}
              />
            ),
          },
        ]}
        footer={
          <p>
            Source: the President&apos;s public schedule from <a className="dk-link" href={FACTBASE}>Factbase</a>.
          </p>
        }
      />
      {/* The calendar is short, so the kit's 440px minimum tab height would leave a blank panel under it. */}
      <div className="nights-card">
      <ChartCard
        id="nights-title"
        title="Where he slept, night by night"
        description="One square per night, one column per week. Hover a square for the date and place."
        date={`${day(travel.from)} to ${day(travel.to)}`}
        tabs={[
          {
            label: "Chart",
            content: (
              <>
                <ul className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
                  {shown.map((c) => (
                    <li key={c.key} className="flex items-center gap-2">
                      <i className="block h-4 w-4 rounded-[2px]" style={{ background: COLORS[c.key as Key].cell }} />
                      {c.label} <span className="text-[#505a5f]">{byCategory[c.key]}</span>
                    </li>
                  ))}
                </ul>
                <NightsGrid travel={travel} />
              </>
            ),
          },
          {
            label: "Tabular data",
            short: "Tabular",
            content: (
              <DataTable
                rows={places}
                rowKey={(p: Place) => p.id}
                columns={[
                  { key: "label", header: "Place", render: (p: Place) => p.label },
                  { key: "name", header: "Last stop of the day", hideBelow: "md", clamp: true, render: (p: Place) => p.name },
                  { key: "category", header: "Group", hideBelow: "sm", render: (p: Place) => label[p.category] },
                  { key: "nights", header: "Nights", align: "right", render: (p: Place) => p.nights },
                ]}
              />
            ),
          },
          {
            label: "Download",
            content: (
              <CsvDownload
                intro="Every night of the past year as a CSV: the date, the place and its group."
                file="trump-nights.csv"
                header={["date", "place", "group"]}
                rows={travel.calendar.map((n: { date: string; place: number }) => [n.date, travel.places[n.place].label, label[travel.places[n.place].category]])}
              />
            ),
          },
        ]}
        footer={
          <p>
            Source: the President&apos;s public schedule from <a className="dk-link" href={FACTBASE}>Factbase</a>.
          </p>
        }
      />
      </div>

      <section className="mt-10 max-w-[48rem]">
        <SectionHeading title="About the data" />
        <ul className="list-disc space-y-3 pl-5 text-[17px] leading-relaxed">
          <li>
            Places come from the President&apos;s public schedule, collected from Factbase and geocoded. Stops within 80 km count as one place,
            so Joint Base Andrews is Washington.
          </li>
          <li>A flight is a move of more than 80 km between two arrivals. Lines join the stops, not actual flight paths.</li>
          <li>
            A night is the last place on each day&apos;s schedule, in Eastern time, carried forward over days with no events. The map and the
            calendar cover the last 365 nights.
          </li>
        </ul>
      </section>
    </main>
  );
}
