import { NextResponse } from "next/server";
import { placeHistory } from "@/lib/travel";
import { globeData, loadCurrentLocation, loadTravel } from "@/lib/travelData";

// The last two weeks of travel and the current location, for the globe on the Schedule page.
const EDGE_CACHE = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };
const DAYS = 14;

export async function GET() {
  try {
    const [travel, now] = await Promise.all([loadTravel(new Date(), { days: DAYS }), loadCurrentLocation()]);
    return NextResponse.json({ data: { ...globeData(travel, placeHistory(travel)), now } }, { headers: EDGE_CACHE });
  } catch (error) {
    console.error("Error fetching recent travel:", error);
    return NextResponse.json({ error: "Failed to fetch recent travel" }, { status: 500 });
  }
}
