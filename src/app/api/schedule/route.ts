import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Public read data — cache at Vercel's edge so scraping/spam serves from the
// CDN instead of hammering Supabase. Data refreshes on the aggregator schedule.
const EDGE_CACHE = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: schedule, error } = await supabase
      .from("schedule")
      .select("*")
      .order("event_datetime", { ascending: false })
      .limit(50);

    if (error) throw error;
    const formattedSchedule =
      schedule?.map((item) => ({
        id: item.id,
        title: item.event_details,
        time: item.event_datetime,
        locationStr: item.location_name,
        location: {
          lat: item.latitude,
          lng: item.longitude,
        },
      })) || [];
    return NextResponse.json({ data: formattedSchedule }, { headers: EDGE_CACHE });
  } catch (error) {
    console.error("Error fetching schedule data:", error);
    return NextResponse.json({ error: "Failed to fetch schedule data" }, { status: 500 });
  }
}
