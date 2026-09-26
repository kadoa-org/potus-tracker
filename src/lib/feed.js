// Dates for the feeds, in Washington time: a post at 11 PM ET belongs to that evening, not to the next UTC day.
// White House releases carry a date only (midnight, +00:00), so their date part is used as it is.
const ET = "America/New_York";
export const dateOnly = (iso) => String(iso).slice(0, 10);

// GOV.UK date and time: "26 September 2026 at 11:58am", in Washington time.
export function govDateTime(iso) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: ET, day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(d).replace(" ", "").toLowerCase();
  return `${date} at ${time}`;
}
// A date-only release: "25 September 2026".
export function govDate(iso) {
  const [y, m, d] = dateOnly(iso).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
