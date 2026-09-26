"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useMemo } from "react";
import { getMockLocation, getMockNews, getMockSchedule, getMockTruth } from "../lib/mockData";
import { govDate, govDateTime } from "../lib/feed";
import { cleanEventTitle, eventTimeLabel, govTime, inDayOrder, isUpcoming } from "../lib/schedule";
import { ScheduleTimeline } from "./ScheduleTimeline.jsx";
import { KeyFigures, SectionHeading } from "../kit";
import { CATEGORY_LABEL } from "./Impact.jsx";
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
// Today's date in Washington. The schedule stores Eastern wall-clock times, so its date part is already an ET date;
// a UTC "today" moved the page to tomorrow's schedule at 8 PM ET.
const etDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const todayKey = () => etDate(new Date());
// Headline cells hold at most two short lines under the value, as UKHSA's do. Schedule entries all open with "The President",
// which says nothing on a page about the President, so it is dropped: "Attends the University of Tennessee ...".
const shortEvent = (title) => {
  const t = cleanEventTitle(title).replace(/^the president\s+/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
// White House categories arrive plural ("Executive Orders"); a single release reads as one.
const singular = (c) => {
  const raw = c || "News";
  // Only a one-kind category is made singular; "Nominations & Appointments" stays as it is.
  const one = raw.includes("&") ? raw : raw.replace(/ies$/, "y").replace(/s$/, "");
  // Sentence case, as GOV.UK writes labels: "Executive order".
  return one.charAt(0).toUpperCase() + one.slice(1).toLowerCase();
};

const More = ({ href, children }) => (
  <Link href={href} className="dk-link text-[16px] whitespace-nowrap">
    {children}
  </Link>
);

export function Today({ initial }) {
  // Mock (local review) reads the fixtures directly; production uses the data
  // fetched server-side in page.tsx and passed as `initial` (same public APIs
  // the deep pages use), so the dashboard ships real content in its HTML.
  const location = MOCK ? getMockLocation() : (initial?.location ?? null);
  const schedule = MOCK ? getMockSchedule() : (initial?.schedule ?? []);
  const truth = MOCK ? getMockTruth() : (initial?.truth ?? []);
  const allNews = MOCK ? getMockNews() : (initial?.news ?? []);
  const news = allNews.slice(0, 3);

  const todaysEvents = useMemo(
    () => schedule.filter((e) => e.time.startsWith(todayKey())).sort((a, b) => new Date(a.time) - new Date(b.time)),
    [schedule],
  );
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
  // matches the headline event, so the two can never disagree about what is
  // upcoming.
  const scheduleView = useMemo(() => {
    if (todaysEvents.length <= SCHEDULE_CAP) return { events: todaysEvents, hidden: 0 };
    const isPast = (e) => !isUpcoming(e);
    const upcoming = todaysEvents.filter((e) => !isPast(e)).slice(0, SCHEDULE_CAP);
    const past = todaysEvents.filter(isPast);
    const fill = past.slice(Math.max(0, past.length - (SCHEDULE_CAP - upcoming.length)));
    const events = [...fill, ...upcoming];
    return { events, hidden: todaysEvents.length - events.length };
  }, [todaysEvents]);

  const traveling = location?.status === "traveling";
  // Headlines are facts that fit a headline cell, as on the UKHSA dashboard: where he is, what is next, and two counts
  // that link to their feeds. The latest post and the latest order were tried as cells, but their only text is a full
  // sentence or a 15-word title, which either overflowed the cell or was cut to nothing; both are the first items of
  // the sections below.
  const matteredToday = truth.filter(
    (p) => (p.signal === "high" || p.signal === "medium") && p.timestamp && etDate(new Date(p.timestamp)) === todayKey(),
  );
  const monthAgo = etDate(new Date(Date.now() - 30 * 86400000));
  const recentOrders = allNews.filter((n) => /executive order/i.test(n.category || "") && String(n.timestamp).slice(0, 10) >= monthAgo);
  // After the day's last event, the headline shows the next one on a later day, or else the day's last event.
  const laterEvent = useMemo(
    () => [...schedule].filter((e) => eventTimeLabel(e.time) && isUpcoming(e)).sort((a, b) => a.time.localeCompare(b.time))[0] ?? null,
    [schedule],
  );
  const lastEvent = [...todaysEvents].reverse().find((e) => eventTimeLabel(e.time) && !isUpcoming(e)) ?? null;
  // Always "Next event": the next one with a known time, today or on a later day; when nothing more is scheduled,
  // the cell says so and names the last event instead.
  const eventCell = laterEvent
    ? {
        label: "Next event",
        value: laterEvent.time.startsWith(todayKey()) ? `${govTime(laterEvent.time)} ET` : `${dateLabel(laterEvent.time).replace(/,.*/, "")}, ${govTime(laterEvent.time)}`,
        note: <span className="line-clamp-2">{shortEvent(laterEvent.title)}</span>,
      }
    : {
        label: "Next event",
        value: "None today",
        note: lastEvent ? <span className="line-clamp-2">Last: {govTime(lastEvent.time)}, {shortEvent(lastEvent.title)}</span> : "Nothing on the public schedule",
      };
  // Only events with a known time count as still ahead; a date-only entry may already have happened.
  const remaining = todaysEvents.filter((e) => eventTimeLabel(e.time) && isUpcoming(e)).length;
  const context = location
    ? `President Trump is ${traveling ? "traveling to" : "at"} ${location.locationName}. ${
        remaining ? `${remaining} more scheduled ${remaining === 1 ? "event" : "events"} today.` : "No more scheduled events today."
      }`
    : null;

  return (
    <main className="potus-today">
      <div className="mb-8">
        <p className="flex items-center gap-2 text-[14px] m-0 mb-2">
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--dk-green)" }}>
            <span className="dk-live-dot" aria-hidden="true" />
            Live
          </span>
          {location?.time && (
            <span className="dk-hint">
              Updated {timeLabel(location.time)} ET, {dateLabel(location.time)}
            </span>
          )}
        </p>
        <h1 className="dk-h1">POTUS Tracker</h1>
        {/* The live answer to "where is Trump today" sits right under the title, where the old sentence-style h1
            put it, so the page still answers the query in its opening text. */}
        <p className="text-[19px] text-[#505a5f] m-0">
          {context ?? "Where President Trump is, his public schedule and what he posts, updated live."}
        </p>
      </div>

      {/* Headlines, as the sibling sites open: where he is, what is next, and how much he has said and signed. The
          location is the answer most readers come for, so it leads. */}
      <KeyFigures
        items={[
          {
            label: traveling ? "Traveling to" : "Current location",
            value: location?.locationName ?? "Not yet known",
            note: !traveling && location?.city ? location.city : undefined,
          },
          eventCell,
          {
            label: "Truth Social posts today",
            value: (
              <Link href="/truth" className="dk-link">
                {matteredToday.length}
              </Link>
            ),
            note: "High or medium impact",
          },
          {
            label: "Executive orders, 30 days",
            value: (
              <Link href="/whitehouse" className="dk-link">
                {recentOrders.length}
              </Link>
            ),
            note: recentOrders[0] ? `Latest ${govDate(recentOrders[0].timestamp).replace(/ \d{4}$/, "")}` : "None in the past 30 days",
          },
        ]}
      />

      {/* Truth Social leads (most relevant, so it is the first section on mobile and the left column on desktop);
          today's schedule follows. */}
      <div className="grid md:grid-cols-2 gap-x-10">
        <section className="dk-section">
          {/* The description carries the AI disclosure once for the whole list: every item is a model-written
              summary, so it belongs in the heading rather than on each row. */}
          <SectionHeading
            title="Truth Social"
            description="AI summaries of high and medium impact posts only."
            right={<More href="/truth">All posts</More>}
          />
          {topSignal.length === 0 ? (
            <div className="dk-empty">No high or medium impact posts yet.</div>
          ) : (
            // The same DWP timeline as the Truth Social page. No impact tag: this panel only lists high and medium
            // impact posts, as its description says, so a tag on every row would repeat it.
            <div className="dwp-timeline dwp-timeline--compact">
              <ol className="dwp-timeline__items">
                {topSignal.map((p) => (
                  <li key={p.id} className="dwp-timeline__item">
                    <p className="dwp-timeline__datetime" suppressHydrationWarning>
                      {govDateTime(p.timestamp)}
                    </p>
                    {/* Clamped so one long summary cannot unbalance the column; the post link carries the full text. */}
                    <h3 className="dwp-timeline__heading line-clamp-3">{p.why_it_matters}</h3>
                    <p className="dwp-timeline__by-line">Topic: {CATEGORY_LABEL[p.category] ?? "Other"}</p>
                    {/* Internal on purpose: /truth?post= pins the full post with its impact analysis and the Truth
                        Social link, which serves "show me the post" better than sending the reader off-site cold. */}
                    <Link href={`/truth?post=${encodeURIComponent(p.id)}`} className="dwp-timeline__link">
                      View post
                      <span className="dk-visually-hidden"> from {govDateTime(p.timestamp)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="dk-section">
          <SectionHeading
            title="Today's schedule"
            description="All times Eastern (ET)."
            right={<More href="/schedule">Full schedule</More>}
          />
          {todaysEvents.length === 0 ? (
            <div className="dk-empty">No events scheduled today.</div>
          ) : (
            <>
              <ScheduleTimeline events={inDayOrder(scheduleView.events)} compact />
              {scheduleView.hidden > 0 && (
                <p className="mt-3 text-[14px]">
                  <Link href="/schedule" className="dk-link">
                    {scheduleView.hidden} more events today
                  </Link>
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {/* Latest White House news, three grey cards across on desktop. */}
      <section className="dk-section">
        <SectionHeading
          title="Latest from the White House"
          description="Official actions and releases, each summarized by AI."
          right={<More href="/whitehouse">All news</More>}
        />
        {/* GOV.UK's document list (the "gem-c-document-list" used on GOV.UK topic and organisation pages): a linked title,
            a short description and a metadata line of type and date, one release under the next. It replaces three
            grey cards, whose titles ran from one line to five and left the cards ragged or, aligned, full of gaps;
            GOV.UK lists documents of uneven length this way rather than in a grid. */}
        <ul className="doc-list">
          {news.map((n) => (
            <li key={n.id} className="doc-list__item">
              <h3 className="doc-list__title">
                {n.link ? (
                  <a href={n.link} target="_blank" rel="noreferrer" className="dk-link">
                    {n.title}
                    <span className="dk-visually-hidden"> (opens the official release)</span>
                  </a>
                ) : (
                  n.title
                )}
              </h3>
              <p className="doc-list__desc line-clamp-2">{n.summary}</p>
              <p className="doc-list__meta">
                {singular(n.category)} <span aria-hidden="true">·</span> {govDate(n.timestamp)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
