import type { Metadata } from "next";
import { NightsGrid } from "@/components/NightsGrid";
import { TravelGlobe } from "@/components/TravelGlobe";
import { DataTable, Section } from "@/kit";
import { CATEGORIES, nightsByCategory } from "@/lib/travel";
import { COLORS } from "@/lib/travelColors";
import { loadTravel } from "@/lib/travelData";

// Rebuilt from the schedule every six hours; the map covers the last 365 complete nights.
export const revalidate = 21600;

const URL = "https://www.kadoa.com/potus/travel";
const TITLE = "Trump Travel Map: Every Flight and Night in the Past Year";
const DESCRIPTION =
  "Where President Trump traveled and slept over the past year: every flight on a globe you can rotate, and a calendar of each night, from his public schedule.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: { url: URL, title: TITLE, description: DESCRIPTION },
  twitter: { title: TITLE, description: DESCRIPTION },
};

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function TravelPage() {
  const travel = await loadTravel();
  const byCategory = nightsByCategory(travel);
  const total = travel.calendar.length;
  const categoryLabel = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  const places = travel.places
    .filter((p) => p.nights > 0)
    .sort((a, b) => b.nights - a.nights || a.label.localeCompare(b.label));
  const miles = Math.round(travel.totalKm / 1.609);

  return (
    <div className="pt-4 pb-16">
      <div className="max-w-3xl">
        <h1 className="dk-h1">Where Trump traveled and slept in the past year</h1>
        <p className="dk-lede">
          {travel.flights.length} flights and {total} nights, {formatDate(travel.from)} to {formatDate(travel.to)}. He spent{" "}
          <strong>
            {travel.weekendsAtProperties} of {travel.weekends} weekends
          </strong>{" "}
          at his own properties. Each line is a flight and each glow a place he slept.
        </p>
      </div>

      <div className="mx-auto mb-10 max-w-[760px]">
        <TravelGlobe
          places={travel.places.map(({ id, lat, lon, label, category, nights, visits }) => ({ id, lat, lon, label, category, nights, visits }))}
          flights={travel.flights.map(({ from, to }) => ({ from, to }))}
        />
      </div>

      <Section title="Where he slept each night" description="One square per night, one column per week. Hover a square for the date and place.">
        <NightsGrid travel={travel} />
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {CATEGORIES.filter((c) => byCategory[c.key] > 0).map((c) => (
            <li key={c.key} className="flex items-center gap-2">
              <i className="block h-4 w-4 rounded-[2px]" style={{ background: COLORS[c.key as keyof typeof COLORS].cell }} />
              {c.label}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Nights, by place">
        <div className="flex h-[30px] gap-[2px]">
          {CATEGORIES.filter((c) => byCategory[c.key] > 0).map((c) => (
            <span
              key={c.key}
              className="flex items-center justify-center text-[15px] font-bold"
              style={{
                flex: byCategory[c.key],
                background: COLORS[c.key as keyof typeof COLORS].cell,
                color: ["washington", "property", "us"].includes(c.key) ? "#0b0c0c" : "#fff",
              }}
              title={`${c.label}: ${byCategory[c.key]} nights`}
            >
              {byCategory[c.key] >= 30 ? byCategory[c.key] : <span className="hidden sm:inline">{byCategory[c.key] >= 5 ? byCategory[c.key] : ""}</span>}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Every place he slept" description={`${places.length} places over ${total} nights.`}>
        <DataTable
          rows={places}
          rowKey={(p: { id: number }) => p.id}
          columns={[
            { key: "label", header: "Place", render: (p: { label: string }) => p.label },
            { key: "name", header: "Last stop of the day", hideBelow: "md", clamp: true, render: (p: { name: string }) => p.name },
            { key: "category", header: "Group", hideBelow: "sm", render: (p: { category: string }) => categoryLabel[p.category] },
            { key: "nights", header: "Nights", align: "right", render: (p: { nights: number }) => p.nights },
          ]}
        />
      </Section>

      <div className="max-w-3xl text-[13px] leading-[1.5] text-[#505a5f]">
        <p>
          Source: the President&apos;s public schedule, geocoded. A flight is a move of more than 80 km between two
          arrivals; lines join the stops, not actual flight paths, and {miles.toLocaleString("en-US")} miles is the
          straight-line total. A night is the last place on each day&apos;s schedule, in Eastern time. A weekend is a
          Saturday night.
        </p>
      </div>
    </div>
  );
}
