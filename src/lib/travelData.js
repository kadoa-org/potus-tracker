import { createClient } from "@supabase/supabase-js";
import { addDays, buildTravel, etDate } from "./travel";

const PAGE = 1000;

// The last 365 complete nights, ending yesterday in Eastern time. Read with the anon key and no cookies so the page can
// be statically cached and rebuilt on a timer.
export async function loadTravel(now = new Date()) {
  const to = addDays(etDate(now.toISOString()), -1);
  const from = addDays(to, -364);
  const supabase = createClient(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const since = new Date(`${addDays(from, -1)}T00:00:00Z`).toISOString();
  const until = new Date(`${addDays(to, 2)}T00:00:00Z`).toISOString();
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
