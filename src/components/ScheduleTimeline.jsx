import { cleanEventTitle, govTime } from "../lib/schedule";

// A day's public schedule as a DWP timeline: the time, the event, and where it is, in the component's order of
// date and time, heading and by-line. Shared by the dashboard and the schedule page so both read the same.
// `headingLevel` follows the page outline: h3 under a section heading. `compact` is the dashboard column size.
export function ScheduleTimeline({ events, headingLevel: H = "h3", compact = false }) {
  return (
    <div className={`dwp-timeline${compact ? " dwp-timeline--compact" : ""}`}>
      <ol className="dwp-timeline__items">
        {events.map((e) => {
          const t = govTime(e.time);
          return (
            <li key={e.id} className="dwp-timeline__item">
              <p className={`dwp-timeline__datetime${t ? "" : " text-[#505a5f]"}`}>{t ? `${t} ET` : "Time not announced"}</p>
              <H className="dwp-timeline__heading">{cleanEventTitle(e.title)}</H>
              {e.locationStr && <p className="dwp-timeline__by-line">{e.locationStr}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
