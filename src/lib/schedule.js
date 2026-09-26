// The FactBase schedule feed carries two kinds of noise that read as low
// quality in search results and on the page: a leading "TBD:" in the event
// details, and a midnight timestamp when only the date (not the time) is known.
// These helpers normalize both so the schedule reads like an authoritative
// source (and matches the clean "8:00 AM · Executive Time" rich snippet Google
// features for competitors).

export function cleanEventTitle(title) {
  return (title || "").replace(/^\s*TBD\s*[:\-–]\s*/i, "").trim();
}

// Wall-clock time label (e.g. "8:55 PM"), or null when the source only had a
// date (stored as 00:00) so callers can show "Time TBD" instead of "12:00 AM".
export function eventTimeLabel(iso) {
  if (!iso) return null;
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2];
  if (h === 0 && min === "00") return null; // date-only placeholder, not a real time
  const period = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${min} ${period}`;
}

// The feed sometimes lists one event twice at the same time: once at the
// White House, which it uses as a default location, and once at the real venue
// (the 26 September 2026 football game appeared at both the White House and
// Neyland Stadium). Rows with the same time and title are one event; the
// specific venue wins over the White House default. Order is preserved.
const DEFAULT_LOCATION = /^the white house$/i;
export function mergeDuplicateEvents(events) {
  const kept = new Map();
  for (const e of events) {
    const key = `${e.time}|${cleanEventTitle(e.title).toLowerCase()}`;
    const seen = kept.get(key);
    if (!seen) kept.set(key, e);
    else if (DEFAULT_LOCATION.test((seen.locationStr || "").trim()) && e.locationStr && !DEFAULT_LOCATION.test(e.locationStr.trim())) kept.set(key, e);
  }
  const winners = new Set(kept.values());
  return events.filter((e) => winners.has(e));
}

// Schedule times are Eastern wall-clock times stored with a +00:00 offset ("12:00:00+00:00" is noon in Washington),
// so parsing them as instants put every event four or five hours early. Events are compared with the current
// Eastern wall-clock time as "YYYY-MM-DDTHH:MM" strings instead.
export function easternNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
// True when the event has not started yet. An event with only a date (no time) counts as upcoming for its whole day.
export function isUpcoming(event, now = new Date()) {
  if (!event?.time) return false;
  const wall = String(event.time).slice(0, 16);
  const current = easternNow(now);
  return eventTimeLabel(event.time) ? wall >= current : wall.slice(0, 10) >= current.slice(0, 10);
}

// GOV.UK time, "8:00am", or null for a date-only event.
export const govTime = (iso) => eventTimeLabel(iso)?.replace(" ", "").toLowerCase() ?? null;

// A day's events in the order they happen, with the ones whose time was not announced at the end.
export function inDayOrder(events) {
  const timed = events.filter((e) => eventTimeLabel(e.time)).sort((a, b) => a.time.localeCompare(b.time));
  return [...timed, ...events.filter((e) => !eventTimeLabel(e.time))];
}
