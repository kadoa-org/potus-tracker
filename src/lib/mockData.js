// Prototype mock data for the "Today" dashboard. Mirrors the shape the
// revamped backend will produce so the UI is exercised without Supabase.
// Gated behind NEXT_PUBLIC_POTUS_MOCK; never used in production builds.
//
//   signal          "high" | "medium" | "low": relevance of the POST only
//   category        enum (see CATEGORY_META in TruthSocial)
//   why_it_matters  one plain sentence
//   entities        [{ type, name }] grounded named entities (people, orgs,
//                    companies, tickers, countries, agencies, places)

const iso = (mins) => new Date(Date.now() - mins * 60_000).toISOString();

const etToday = (hhmm) => {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hhmm}:00-04:00`;
};
const etDay = (offsetDays, hhmm) => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hhmm}:00-04:00`;
};

export function getMockLocation() {
  return {
    locationName: "The White House",
    city: "Washington, D.C.",
    lat: 38.8977,
    lon: -77.0365,
    time: etToday("15:00"),
    status: "at", // "at" | "traveling"
  };
}

export function getMockSchedule() {
  return [
    {
      id: "s1",
      time: etToday("16:30"),
      title: "Delivers remarks at the Kennedy Center",
      locationStr: "Washington, D.C.",
    },
    {
      id: "s2",
      time: etToday("15:00"),
      title: "Delivers remarks on the economy",
      locationStr: "Wheeler High School, Marietta, GA",
    },
    {
      id: "s3",
      time: etToday("13:15"),
      title: "Departs Joint Base Andrews en route to Georgia",
      locationStr: "Joint Base Andrews",
    },
    {
      id: "s4",
      time: etToday("11:00"),
      title: "Receives the Presidential Daily Briefing",
      locationStr: "The White House",
    },
    {
      id: "s5",
      time: etToday("09:30"),
      title: "Signs proclamations and executive actions",
      locationStr: "Oval Office",
    },
    {
      id: "y1",
      time: etDay(-1, "14:00"),
      title: "Meeting with the Secretary of Defense",
      locationStr: "The White House",
    },
    {
      id: "y2",
      time: etDay(-1, "10:00"),
      title: "Dignified transfer of remains",
      locationStr: "Dover Air Force Base, DE",
    },
    { id: "t1", time: etDay(1, "12:00"), title: "Cabinet meeting", locationStr: "The White House" },
  ];
}

export function getMockNextEvent() {
  return { time: etToday("16:30"), title: "Delivers remarks at the Kennedy Center", locationStr: "Washington, D.C." };
}

export function getMockNews() {
  return [
    {
      id: "n1",
      title: "Seven personnel nominations sent to the Senate",
      summary:
        "The White House submitted seven nominations for Senate confirmation, including an Assistant Attorney General and ambassadors to Rwanda and Malaysia.",
      source: "The White House",
      link: "https://www.whitehouse.gov",
      timestamp: iso(90),
      category: "Nominations",
    },
    {
      id: "n2",
      title: "Proclamation: additional duties on Canadian dairy",
      summary:
        "A 50% tariff on select Canadian dairy imports takes effect August 19 to offset what the proclamation calls unfair trade practices.",
      source: "The White House",
      link: "https://www.whitehouse.gov",
      timestamp: iso(200),
      category: "Proclamations",
    },
    {
      id: "n3",
      title: "Actions to adjust aluminum imports",
      summary:
        "Companies that commit to building or expanding U.S. aluminum facilities can receive a 50% tariff reduction on matching volumes.",
      source: "The White House",
      link: "https://www.whitehouse.gov",
      timestamp: iso(320),
      category: "Proclamations",
    },
  ];
}

// Signal is a 3-class scale: "high" | "medium" | "low". Scores ONLY the
// relevance of a Truth Social post (real-world consequence), nothing else.
export function getMockTruth() {
  return [
    {
      id: "t-1",
      text: "From this point forward, any time the Islamic Republic of Iran shoots at a ship in the Strait of Hormuz, the United States will respond with overwhelming force. Thank you for your attention to this matter!",
      timestamp: iso(75),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "high",
      category: "foreign_policy",
      why_it_matters:
        "A direct military threat over Strait of Hormuz shipping: an escalation and oil-market risk, not rhetoric.",
      sentiment: "negative",
      entities: [
        { type: "country", name: "Iran" },
        { type: "place", name: "Strait of Hormuz" },
      ],
      isMedia: false,
    },
    {
      id: "t-2",
      text: "I am imposing an ADDITIONAL 50% TARIFF on Canadian dairy, effective August 19th, to offset their unfair treatment of American farmers. Canada has taken advantage of us for FAR too long!",
      timestamp: iso(140),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "high",
      category: "market_moving",
      why_it_matters: "A concrete tariff action with a date that moves trade policy and hits dairy and ag markets.",
      sentiment: "negative",
      entities: [{ type: "country", name: "Canada" }],
      isMedia: false,
    },
    {
      id: "t-3",
      text: "I have directed the Treasury and Commerce Departments to review all semiconductor imports for national security implications. A decision will be announced shortly.",
      timestamp: iso(220),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "medium",
      category: "policy_action",
      why_it_matters: "Signals imminent action on chip tariffs: a heads-up that a market-moving decision is coming.",
      sentiment: "neutral",
      entities: [
        { type: "agency", name: "Treasury Department" },
        { type: "agency", name: "Commerce Department" },
      ],
      isMedia: false,
    },
    {
      id: "t-4",
      text: "The Fed must CUT RATES. Inflation is DEAD and we are being held back by people who have no idea what they are doing!",
      timestamp: iso(300),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "medium",
      category: "market_moving",
      why_it_matters: "Renewed pressure on the Fed ahead of the rate decision. Bond and rates traders watch this.",
      sentiment: "negative",
      entities: [{ type: "agency", name: "Federal Reserve" }],
      isMedia: false,
    },
    {
      id: "t-5",
      text: "Heading to Dover Air Force Base to HONOR OUR HEROES. God bless our troops! President DJT",
      timestamp: iso(360),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "medium",
      category: "other",
      why_it_matters: "Confirms a same-day travel and schedule change, useful for whereabouts, not policy.",
      sentiment: "positive",
      entities: [{ type: "place", name: "Dover Air Force Base" }],
      isMedia: false,
    },
    {
      id: "t-6",
      text: "MAGA CANDIDATES WON EVERYTHING LAST NIGHT IN ARIZONA, A COMPLETE SWEEP!!! The Radical Left is in total disarray. CONGRATULATIONS TO ALL!",
      timestamp: iso(440),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "low",
      category: "campaign",
      why_it_matters: "Campaign commentary on election results, with no action or policy signal.",
      sentiment: "positive",
      entities: [{ type: "place", name: "Arizona" }],
      isMedia: false,
    },
    {
      id: "t-7",
      text: "A Crooked Election System! SAVE AMERICA!!!",
      timestamp: iso(520),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "low",
      category: "campaign",
      why_it_matters: "General campaign slogan: high volume, low information.",
      sentiment: "negative",
      entities: [],
      isMedia: false,
    },
    {
      id: "t-8",
      text: "",
      timestamp: iso(600),
      original_post_link: "https://truthsocial.com/@realDonaldTrump",
      signal: "low",
      category: "other",
      why_it_matters: "Media-only repost with no text and no informational content.",
      sentiment: "neutral",
      entities: [],
      isMedia: true,
    },
  ];
}
