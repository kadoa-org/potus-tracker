import { createClient } from "@supabase/supabase-js";
import { addDays, buildTravel, etDate, shortLabel } from "./travel";

const PAGE = 1000;

// Read with the anon key and no cookies so pages that use this can be statically cached and rebuilt on a timer.
const client = () =>
  createClient(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

// The last `days` complete nights, ending yesterday in Eastern time.
export async function loadTravel(now = new Date(), { days = 365 } = {}) {
  const to = addDays(etDate(now.toISOString()), -1);
  const from = addDays(to, -(days - 1));
  const supabase = client();
  const since = `${addDays(from, -1)}T00:00:00Z`;
  const until = `${addDays(to, 2)}T00:00:00Z`;
  const events = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from("schedule")
      .select("event_details,event_datetime,location_name,latitude,longitude")
      .gte("event_datetime", since)
      .lt("event_datetime", until)
      .order("event_datetime", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    events.push(...data);
    if (data.length < PAGE) break;
  }
  return buildTravel(events, { from, to });
}

const wallFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
// Now as an Eastern wall-clock time labelled +00:00, the way the schedule stores event times.
const easternWallClock = (now) => {
  const p = Object.fromEntries(wallFormat.formatToParts(now).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}+00:00`;
};

// The latest geocoded event that has already happened in Washington time.
export async function loadCurrentLocation(now = new Date()) {
  const { data, error } = await client()
    .from("schedule")
    .select("event_datetime,location_name,latitude,longitude")
    .lte("event_datetime", easternWallClock(now))
    .not("latitude", "is", null)
    .order("event_datetime", { ascending: false })
    .limit(1);
  if (error) throw error;
  const e = data?.[0];
  if (!e) return null;
  return { lat: e.latitude, lon: e.longitude, time: e.event_datetime, name: e.location_name, label: shortLabel(e.location_name ?? "") };
}

// The slim shape the globe needs, so client payloads carry only coordinates, labels and dates.
export function globeData(travel, history) {
  return {
    to: travel.to,
    places: travel.places.map(({ id, lat, lon, label, name, category, nights, visits }, i) => ({ id, lat, lon, label, name, category, nights, visits, ...(history?.[i] ?? {}) })),
    flights: travel.flights.map(({ from, to, date }) => ({ from, to, date })),
  };
}
