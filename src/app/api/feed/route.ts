import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Public read data — cache each URL (query params included) at Vercel's edge so
// scraping/spam serves from the CDN instead of hammering Supabase.
const EDGE_CACHE = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type") || "all";
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Fetch data based on type filter
    if (type === "news") {
      const {
        data: news,
        error,
        count,
      } = await supabase
        .from("news")
        .select("*", { count: "exact" })
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const formattedNews =
        news?.map((item) => ({
          id: item.id,
          title: item.title,
          text: item.content,
          summary: item.summary,
          source: item.author,
          link: item.link,
          timestamp: item.date,
          type: "News",
          category: item.category,
        })) || [];

      return NextResponse.json(
        {
          data: formattedNews,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page,
        },
        { headers: EDGE_CACHE },
      );
    } else if (type === "truth_social") {
      // Optional server-side filters so pagination stays correct across the
      // whole dataset (not just the current page). `signal` = impact level,
      // `category` = domain. Unscored historical rows are excluded once a
      // filter is applied, which is intended.
      //
      // `signal` accepts a comma list ("high,medium") because the dashboard
      // needs "the latest posts that matter": filtering the newest N client-side
      // showed nothing whenever a run of low-impact reposts filled the window.
      const signalFilter = searchParams.get("signal");
      const categoryFilter = searchParams.get("category");
      // Single-post lookup, used by /truth?post=<id> to pin the linked post.
      // A post can sit pages deep once newer low-impact posts pile on top, so
      // the permalink cannot rely on the post being in page 1.
      const idFilter = searchParams.get("id");

      let query = supabase.from("truth_social").select("*", { count: "exact" }).order("date", { ascending: false });
      if (idFilter) query = query.eq("id", idFilter);
      if (signalFilter) {
        const signals = signalFilter
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (signals.length > 0) query = query.in("signal", signals);
      }
      if (categoryFilter) query = query.eq("category", categoryFilter);

      const { data: truthSocial, error, count } = await query.range(offset, offset + limit - 1);

      if (error) throw error;

      const formattedTruthSocial =
        truthSocial?.map((item) => ({
          id: item.id,
          title: "Truth Social Post",
          text: item.content,
          source: "Truth Social",
          link: item.link,
          original_post_link: item.original_post_link,
          timestamp: item.date,
          type: "Truth Social",
          signal: item.signal,
          category: item.category,
          why_it_matters: item.why_it_matters,
          sentiment: item.sentiment,
          entities: item.entities,
        })) || [];

      return NextResponse.json(
        {
          data: formattedTruthSocial,
          totalPages: Math.ceil((count || 0) / limit),
          currentPage: page,
        },
        { headers: EDGE_CACHE },
      );
    } else {
      // Fetch both news and truth social posts
      const [newsResult, truthSocialResult] = await Promise.all([
        supabase.from("news").select("*", { count: "exact" }).order("date", { ascending: false }),
        supabase.from("truth_social").select("*", { count: "exact" }).order("date", { ascending: false }),
      ]);

      if (newsResult.error) throw newsResult.error;
      if (truthSocialResult.error) throw truthSocialResult.error;

      // Combine and format the data
      const formattedNews =
        newsResult.data?.map((item) => ({
          id: item.id,
          title: item.title,
          text: item.content,
          source: item.author,
          link: item.link,
          timestamp: item.date,
          type: "News",
          category: item.category,
        })) || [];

      const formattedTruthSocial =
        truthSocialResult.data?.map((item) => ({
          id: item.id,
          title: "Truth Social Post",
          text: item.content,
          source: "Truth Social",
          link: item.link,
          timestamp: item.date,
          type: "Truth Social",
          signal: item.signal,
          category: item.category,
          why_it_matters: item.why_it_matters,
          sentiment: item.sentiment,
          entities: item.entities,
        })) || [];

      // Combine and sort by timestamp
      const allItems = [...formattedNews, ...formattedTruthSocial].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Apply pagination
      const paginatedItems = allItems.slice(offset, offset + limit);
      const totalCount = allItems.length;

      return NextResponse.json(
        {
          data: paginatedItems,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
        },
        { headers: EDGE_CACHE },
      );
    }
  } catch (error) {
    console.error("Error fetching feed data:", error);
    return NextResponse.json({ error: "Failed to fetch feed data" }, { status: 500 });
  }
}
