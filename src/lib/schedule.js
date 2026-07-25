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
