"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";
import { getMockLocation, getMockNews, getMockNextEvent, getMockSchedule, getMockTruth } from "../lib/mockData";
import { cleanEventTitle, eventTimeLabel } from "../lib/schedule";
import { ImpactBadge } from "./Impact.jsx";
import { RelativeTime } from "./RelativeTime.jsx";

const MOCK = process.env.NEXT_PUBLIC_POTUS_MOCK === "1";

/**
 * Panel caps. These two sit side by side on desktop, so they are balanced by
 * visual height, not item count: a Truth Social item (badge row + a clamped
 * summary + meta) is about twice as tall as a schedule row, so 5 posts fill
 * roughly the same column as 8 schedule rows plus the overflow footer. Both
 * panels are a taste that defers to a deep page, not the archive.
 */
const TRUTH_CAP = 5;
const SCHEDULE_CAP = 8;

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

export function Today({ initial }) {
  // Mock (local review) reads the fixtures directly; production uses the data
  // fetched server-side in page.tsx and passed as `initial` (same public APIs
  // the deep pages use), so the dashboard ships real content in its HTML.
  const location = MOCK ? getMockLocation() : (initial?.location ?? null);
  const schedule = MOCK ? getMockSchedule() : (initial?.schedule ?? []);
  const truth = MOCK ? getMockTruth() : (initial?.truth ?? []);
  const news = MOCK ? getMockNews() : (initial?.news ?? []);

  const todaysEvents = useMemo(
    () => schedule.filter((e) => e.time.startsWith(todayKey())).sort((a, b) => new Date(a.time) - new Date(b.time)),
    [schedule],
  );
  // Next upcoming event: earliest event still in the future. In mock we use the
  // fixture so the reviewed layout is stable.
  const nextEvent = useMemo(() => {
    if (MOCK) return getMockNextEvent();
    const now = Date.now();
    return (
      [...schedule]
        .filter((e) => e.time && new Date(e.time).getTime() >= now)
        .sort((a, b) => new Date(a.time) - new Date(b.time))[0] ?? null
    );
  }, [schedule]);
  // Latest posts that matter, newest first. Production already receives only
  // high+medium (filtered server-side, so the panel is never empty just because
  // recent posts were reposts); the filter here re-applies that for the mock
  // fixtures, which carry all impact levels.
  const topSignal = useMemo(
    () =>
      truth
        .filter((p) => p.signal === "high" || p.signal === "medium")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, TRUTH_CAP),
    [truth],
  );

  // Cap the schedule panel: a busy day runs 15+ entries and the column grows
  // far past the Truth Social panel beside it. What is still ahead is kept in
  // full; past events only fill leftover slots (most recent first), so in the
  // evening the panel is not just history. Events with no wall-clock time
  // (TBD) count as upcoming, same as the "Next:" line above. The comparison
  // matches the nextEvent memo, so the two can never disagree about what is
  // upcoming.
  const scheduleView = useMemo(() => {
    if (todaysEvents.length <= SCHEDULE_CAP) return { events: todaysEvents, hidden: 0 };
    const now = Date.now();
    const isPast = (e) => Boolean(eventTimeLabel(e.time)) && new Date(e.time).getTime() < now;
    const upcoming = todaysEvents.filter((e) => !isPast(e)).slice(0, SCHEDULE_CAP);
    const past = todaysEvents.filter(isPast);
    const fill = past.slice(Math.max(0, past.length - (SCHEDULE_CAP - upcoming.length)));
    const events = [...fill, ...upcoming];
    return { events, hidden: todaysEvents.length - events.length };
  }, [todaysEvents]);

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
            <span className="font-semibold">Next:</span> {cleanEventTitle(nextEvent.title)}
            {nextEvent.locationStr ? `, ${nextEvent.locationStr}` : ""}
            {eventTimeLabel(nextEvent.time) && (
              <span className="text-[#505a5f]"> · {eventTimeLabel(nextEvent.time)} ET</span>
            )}
          </p>
        )}
      </div>

      {/* Row 1: Truth Social leads (most relevant, so it's the first section on
          mobile and the left column on desktop); today's schedule follows. */}
      <div className="grid md:grid-cols-2 border-t border-[#b1b4b6]">
        <section className="bg-white border-b md:border-b-0 md:border-r border-[#e5e6e7]">
          {/* The hint carries the AI disclosure once for the whole list. Every
              item is a model-written summary, and a uniform property of the
              list belongs in the header; repeating "AI summary" on each row was
              noise that also made rows taller than the schedule beside them. */}
          <Head
            title="Truth Social"
            hint="AI summaries of high and medium impact posts"
            href="/truth"
            cta="All posts"
          />
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
                  {/* Clamped so one long summary cannot unbalance the column;
                      the post link below carries the full context. */}
                  <p className="font-semibold leading-snug line-clamp-3">{p.why_it_matters}</p>
                  {/* Own line, same position on every card. In the meta row the
                      link only fit when badge + category + timestamp happened
                      to be short, so it jumped between inline and wrapped from
                      one card to the next.

                      Internal on purpose: the card shows only the AI summary,
                      and /truth?post= pins the full post text with its impact
                      analysis and the Truth Social link, which serves "show me
                      the post" better than sending the reader off-site cold. */}
                  <Link
                    href={`/truth?post=${encodeURIComponent(p.id)}`}
                    className="dk-link text-[12px] mt-1 inline-block"
                  >
                    View post →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border-b border-[#e5e6e7]">
          <Head title="Today's schedule" hint="All times Eastern (ET)" href="/schedule" cta="Full schedule" />
          {todaysEvents.length === 0 ? (
            <div className="dk-empty">No events scheduled today.</div>
          ) : (
            <>
              <ul>
                {scheduleView.events.map((e) => {
                  const t = eventTimeLabel(e.time);
                  return (
                    <li key={e.id} className="flex gap-3 p-4 md:px-6 border-b border-[#f0efed] last:border-0">
                      <span
                        className={`text-[13px] font-semibold tabular-nums w-[68px] flex-shrink-0 ${
                          t ? "text-[#1d70b8]" : "text-[#8a9196]"
                        }`}
                      >
                        {t || "TBD"}
                      </span>
                      <span className="min-w-0">
                        <span className="block">{cleanEventTitle(e.title)}</span>
                        <span className="block dk-hint text-[13px]">{e.locationStr}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {scheduleView.hidden > 0 && (
                <div className="p-3 md:px-6 border-t border-[#f0efed]">
                  <Link href="/schedule" className="dk-link text-[13px]">
                    +{scheduleView.hidden} more events today · Full schedule →
                  </Link>
                </div>
              )}
            </>
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
