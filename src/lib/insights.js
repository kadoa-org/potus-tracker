// One entry per insight page (/insights/<slug>), as on the Congress Trading Monitor: the index lists them as cards and
// each page sets its own title and description so a link shares well.
export const INSIGHTS = [
  {
    slug: "trump-trades",
    title: "Trump's accounts made more trades than all of Congress combined",
    summary: "31,877 disclosed trades since January 2025, against 20,973 by all of Congress, spread across hundreds of stocks.",
    seoTitle: "Trump's Stock Trades vs Congress",
    seoDescription: "Trump's investment accounts made 31,877 disclosed trades from January 2025 to August 2026, more than all 175 trading members of Congress combined. Most were stocks in big companies.",
  },
  {
    slug: "travel-map",
    title: "Where Trump traveled and slept",
    summary: "Every flight of the past year on a globe you can rotate, and where he spent each night.",
    // The old /travel page's title and description, which it ranked with.
    seoTitle: "Trump Travel Map: Every Flight and Night in the Past Year",
    seoDescription: "Where President Trump traveled and slept over the past year: every flight on a globe you can rotate, and a calendar of each night, from his public schedule.",
  },
];
export const insightBySlug = (slug) => INSIGHTS.find((i) => i.slug === slug);
