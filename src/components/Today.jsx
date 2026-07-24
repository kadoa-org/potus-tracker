"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";
import { getMockLocation, getMockNews, getMockNextEvent, getMockSchedule, getMockTruth } from "../lib/mockData";
import { ImpactBadge, SIG } from "./Impact.jsx";
import { RelativeTime } from "./RelativeTime.jsx";

const MOCK = process.env.NEXT_PUBLIC_POTUS_MOCK === "1";

const timeLabel = (t) => {
  if (!t) return "";
  const m = t.match(/T(\d{2}):(\d{2})/);
  if (!m) return format(new Date(t), "h:mm a");
  const h = parseInt(m[1]);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${m[2]} ${period}`;
};
const dateLabel = (t) => {
  if (!t) return "";
  const m = t.match(/(\d{4}-\d{2}-\d{2})/);
  const [y, mo, d] = (m ? m[1] : t).split("-").map(Number);
  return format(new Date(y, mo - 1, d), "EEEE, MMMM d");
};
const todayKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

const Head = ({ title, hint, href, cta }) => (
  <div className="flex items-baseline justify-between gap-3 p-4 md:px-6 border-b border-[#e5e6e7]">
    <div className="min-w-0">
      <h2 className="font-bold text-[17px]">{title}</h2>
      {hint && <p className="dk-hint text-[12px] mt-0.5">{hint}</p>}
    </div>
    {href && (
      <Link href={href} className="dk-link text-[13px] whitespace-nowrap">
        {cta} →
      </Link>
    )}
  </div>
);

export function Today() {
  const location = MOCK ? getMockLocation() : null;
  const schedule = MOCK ? getMockSchedule() : [];
  const truth = MOCK ? getMockTruth() : [];
  const news = MOCK ? getMockNews() : [];
  const nextEvent = MOCK ? getMockNextEvent() : null;

  const todaysEvents = useMemo(
    () => schedule.filter((e) => e.time.startsWith(todayKey())).sort((a, b) => new Date(a.time) - new Date(b.time)),
    [schedule],
  );
  // Show the most consequential posts (never "low"), highest impact first. Up
  // to 5 so the panel roughly balances the day's schedule beside it instead of
  // leaving a tall empty gap.
  const topSignal = useMemo(
    () =>
      truth
        .filter((p) => p.signal !== "low")
        .sort(
          (a, b) =>
            (SIG[b.signal]?.rank ?? 0) - (SIG[a.signal]?.rank ?? 0) || new Date(b.timestamp) - new Date(a.timestamp),
        )
        .slice(0, 5),
    [truth],
  );

  const traveling = location?.status === "traveling";
  const answer = location
    ? traveling
      ? `President Trump is traveling to ${location.locationName}`
      : `President Trump is at ${location.locationName}`
    : "Locating the President";

  return (
    <main>
      {/* Top section: the "where + what's next" answer. The full location map
          lives on /schedule; the text here already answers the question. */}
      <div className="p-5 md:p-8 bg-white">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--dk-green)" }}>
            <span className="dk-live-dot" aria-hidden="true" />
            Live
          </span>
          <span className="dk-hint">
            · Updated {timeLabel(location?.time)} ET, {dateLabel(location?.time)}
          </span>
        </div>
        <h1 className="mt-2 font-bold leading-[1.1]" style={{ fontSize: "clamp(26px, 5vw, 40px)" }}>
          {answer}
        </h1>
        {location?.city && !traveling && <p className="mt-2 text-[17px] text-[#505a5f]">{location.city}</p>}
        {nextEvent && (
          <p className="mt-4 text-[17px]">
            <span className="font-semibold">Next:</span> {nextEvent.title}
            {nextEvent.locationStr ? `, ${nextEvent.locationStr}` : ""}
            <span className="text-[#505a5f]"> · {timeLabel(nextEvent.time)} ET</span>
          </p>
        )}
      </div>

      {/* Row 1: today's schedule + top Truth Social signal */}
      <div className="grid md:grid-cols-2 border-t border-[#b1b4b6]">
        <section className="bg-white border-b md:border-b-0 md:border-r border-[#e5e6e7]">
          <Head title="Today's schedule" hint="All times Eastern (ET)" href="/schedule" cta="Full schedule" />
          {todaysEvents.length === 0 ? (
            <div className="dk-empty">No events scheduled today.</div>
          ) : (
            <ul>
              {todaysEvents.map((e) => (
                <li key={e.id} className="flex gap-3 p-4 md:px-6 border-b border-[#f0efed] last:border-0">
                  <span className="text-[13px] font-semibold text-[#1d70b8] tabular-nums w-[68px] flex-shrink-0">
                    {timeLabel(e.time)}
                  </span>
                  <span className="min-w-0">
                    <span className="block">{e.title}</span>
                    <span className="block dk-hint text-[13px]">{e.locationStr}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border-b border-[#e5e6e7]">
          <Head title="Truth Social" hint="Posts ranked by real-world impact" href="/truth" cta="All posts" />
          {topSignal.length === 0 ? (
            <div className="dk-empty">No high or medium impact posts yet.</div>
          ) : (
            <ul>
              {topSignal.map((p) => (
                <li key={p.id} className="p-4 md:px-6 border-b border-[#f0efed] last:border-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <ImpactBadge signal={p.signal} category={p.category} />
                    <span className="dk-hint text-[12px]">
                      · <RelativeTime iso={p.timestamp} />
                    </span>
                  </div>
                  <p className="font-semibold leading-snug">{p.why_it_matters}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Row 2: latest White House news, full width (three across on desktop) */}
      <section className="bg-white border-t border-[#b1b4b6]">
        <Head
          title="Latest from the White House"
          hint="Official actions and releases"
          href="/whitehouse"
          cta="All news"
        />
        <ul className="grid md:grid-cols-3">
          {news.map((n) => (
            <li
              key={n.id}
              className="p-4 md:px-6 border-b md:border-b-0 border-[#f0efed] md:border-r md:border-[#e5e6e7] last:border-0 md:last:border-r-0"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#505a5f]">{n.category}</div>
              <div className="font-semibold leading-snug mt-1">{n.title}</div>
              <div className="dk-hint text-[13px] mt-0.5">
                <RelativeTime iso={n.timestamp} />
              </div>
              <p className="mt-1 text-[#505a5f] line-clamp-3 leading-relaxed text-[14px]">{n.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
