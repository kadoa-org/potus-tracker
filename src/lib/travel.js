// A year of presidential travel from the public schedule. A flight is a move between "arrives" events more than 80 km
// apart; moves faster than 1,000 km/h are geocoding mix-ups (the event names one airport, its coordinates another) and
// are dropped. Stops within 80 km are one place, so Joint Base Andrews is Washington. A night is the place of the last
// geocoded event on that Eastern-time day, carried forward over days with no events.

const EARTH_KM = 6371;
const NEAR_KM = 80;
const MAX_KMH = 1000;
const RAD = Math.PI / 180;

export const km = (a, b) =>
  2 *
  EARTH_KM *
  Math.asin(
    Math.sqrt(
      Math.sin(((b.lat - a.lat) * RAD) / 2) ** 2 +
        Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(((b.lon - a.lon) * RAD) / 2) ** 2,
    ),
  );

const etFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
// Today's date in Washington, for a real instant such as now.
export const etDate = (iso) => etFormat.format(new Date(iso));
// The schedule stores Eastern wall-clock times labelled +00:00, so an event's date is the date as written.
export const eventDay = (iso) => iso.slice(0, 10);

export const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const CATEGORIES = [
  { key: "washington", label: "Washington" },
  { key: "maralago", label: "Mar-a-Lago" },
  { key: "bedminster", label: "Bedminster" },
  { key: "property", label: "Other Trump properties" },
  { key: "us", label: "Elsewhere in the US" },
  { key: "abroad", label: "Abroad" },
];

// Seeded first so these clusters centre on the places themselves rather than on a nearby airport.
const SEEDS = [
  { lat: 38.8977, lon: -77.0365, name: "The White House" },
  { lat: 26.677, lon: -80.037, name: "Mar-a-Lago" },
  { lat: 40.64, lon: -74.66, name: "Trump National Golf Club Bedminster" },
];

const TRUMP_PROPERTY = /\bTrump (National|International)\b|\bMar-a-Lago\b|\bTurnberry\b|\bTrump Tower\b/i;
const inUS = (p) => p.lat > 18 && p.lon < -60 && p.lon > -170;

function categoryOf(cluster, index) {
  if (index === 0) return "washington";
  if (index === 1) return "maralago";
  if (index === 2) return "bedminster";
  // A place counts as a Trump property when most of the nights spent there ended at one, so a cluster that holds both
  // Miami International Airport and Trump National Doral is a property only if he slept at Doral.
  const nightNames = Object.entries(cluster.nightNames);
  const total = nightNames.reduce((a, [, n]) => a + n, 0);
  const owned = nightNames.filter(([name]) => TRUMP_PROPERTY.test(name)).reduce((a, [, n]) => a + n, 0);
  if (total > 0 && owned * 2 > total) return "property";
  return inUS(cluster) ? "us" : "abroad";
}

const PLACE_NAMES = [
  [/\bMar-a-Lago\b|Palm Beach/i, "Mar-a-Lago"],
  [/Bedminster|Morristown/i, "Bedminster"],
  [/\bDoral\b/i, "Doral"],
  [/Doonbeg/i, "Doonbeg"],
  [/Turnberry/i, "Turnberry"],
  [/White House|Andrews/i, "Washington"],
  [/Camp David/i, "Camp David"],
  [/Anchorage/i, "Anchorage"],
];
const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii Idaho Illinois Indiana Iowa Kansas Kentucky Louisiana Maine Maryland Massachusetts Michigan Minnesota Mississippi Missouri Montana Nebraska Nevada Ohio Oklahoma Oregon Pennsylvania Tennessee Texas Utah Vermont Virginia Washington Wisconsin Wyoming"
    .split(" ")
    .concat(["New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Rhode Island", "South Carolina", "South Dakota", "West Virginia"]),
);
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = new Set();
for (const a of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") for (const b of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  try {
    const name = regionNames.of(a + b);
    if (name && name !== a + b) COUNTRIES.add(name);
  } catch {}
}
// Common English names that differ from the CLDR region names.
for (const name of ["Turkey", "Czech Republic", "UK", "England", "Scotland", "Wales", "USA", "Holland", "Vatican"]) COUNTRIES.add(name);
const isRegion = (s) => US_STATES.has(s) || COUNTRIES.has(s);
const VENUE_WORDS = /\b(Four Seasons Hotel|InterContinental|Hilton|Arts Cent(re|er)|Hotel|Resort|Convention Cent(re|er)|Congress Cent(re|er)|Presidential Compound|US Fleet Activities|Palace|The)\b/gi;
const PLACE_SUFFIX = /\s*\b((International|Regional|Municipal)\s+)?(Airport|Air Force Base|Air Base|Air Reserve Base|Air National Guard Base)\b.*$/i;
const clean = (s) => s.replace(PLACE_SUFFIX, "").replace(VENUE_WORDS, "").replace(/\s+/g, " ").trim();
// A short place label from a schedule location ("Bestepe Presidential Compound, Ankara, Turkey" is "Ankara"): known
// places by name, then the city part of the location, then the venue with brand and building words removed.
export function shortLabel(name) {
  for (const [re, label] of PLACE_NAMES) if (re.test(name)) return label;
  const parts = name.split(",").map((s) => s.trim()).filter(Boolean);
  while (parts.length > 1 && isRegion(parts.at(-1))) parts.pop();
  const city = parts.length > 1 ? parts.at(-1) : null;
  return city ?? (clean(parts[0] ?? name) || parts[0] || name);
}

/**
 * @param {{ event_details: string, event_datetime: string, location_name: string, latitude: number|null, longitude: number|null }[]} events
 * @param {{ from: string, to: string }} range Eastern-time dates, inclusive
 */
export function buildTravel(events, { from, to }) {
  const geo = events
    .filter((e) => e.latitude != null && e.longitude != null && !/^TBD/i.test(e.event_details ?? ""))
    .map((e) => ({ lat: e.latitude, lon: e.longitude, name: e.location_name ?? "", t: Date.parse(e.event_datetime), day: eventDay(e.event_datetime), details: e.event_details ?? "" }))
    .filter((e) => e.day >= from && e.day <= to)
    .sort((a, b) => a.t - b.t);

  const clusters = [];
  const clusterOf = (p) => {
    let c = clusters.find((c) => km(c, p) < NEAR_KM);
    if (!c) {
      c = { lat: p.lat, lon: p.lon, names: {}, nightNames: {}, nights: 0, visits: 0 };
      clusters.push(c);
    }
    if (p.name) c.names[p.name] = (c.names[p.name] ?? 0) + 1;
    return c;
  };
  for (const seed of SEEDS) clusterOf(seed);

  const flights = [];
  let last = null;
  for (const p of geo.filter((e) => /\barrives\b/i.test(e.details))) {
    const dist = last ? km(last, p) : 0;
    if (last && dist > NEAR_KM) {
      const hours = Math.max((p.t - last.t) / 3.6e6, 0.01);
      if (dist / hours > MAX_KMH) continue;
      const a = clusterOf(last), b = clusterOf(p);
      if (a !== b) {
        flights.push({ from: clusters.indexOf(a), to: clusters.indexOf(b), date: p.day });
        b.visits++;
      }
    }
    if (!last || dist > NEAR_KM) last = p;
  }

  const lastOfDay = new Map();
  for (const e of geo) lastOfDay.set(e.day, e);
  const calendar = [];
  let prev = clusters[0];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const e = lastOfDay.get(day);
    const c = e ? clusterOf(e) : prev;
    if (e?.name) c.nightNames[e.name] = (c.nightNames[e.name] ?? 0) + 1;
    c.nights++;
    prev = c;
    calendar.push({ date: day, place: clusters.indexOf(c) });
  }

  const places = clusters.map((c, i) => {
    const top = Object.entries(c.nightNames).sort((a, b) => b[1] - a[1])[0]?.[0] ?? Object.entries(c.names).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    return { id: i, lat: c.lat, lon: c.lon, name: top, label: i === 0 ? "Washington" : shortLabel(top), category: categoryOf(c, i), nights: c.nights, visits: c.visits };
  });
  const totalKm = flights.reduce((a, f) => a + km(places[f.from], places[f.to]), 0);
  const weekends = calendar.filter((n) => new Date(`${n.date}T12:00:00Z`).getUTCDay() === 6);
  const owned = new Set(["maralago", "bedminster", "property"]);
  return {
    from,
    to,
    places,
    flights,
    calendar,
    totalKm: Math.round(totalKm),
    weekends: weekends.length,
    weekendsAtProperties: weekends.filter((n) => owned.has(places[n.place].category)).length,
  };
}

export function nightsByCategory(travel) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]));
  for (const n of travel.calendar) counts[travel.places[n.place].category]++;
  return counts;
}

// Per place: each run of consecutive nights there as a stay, and the dates of each flight that landed there.
export function placeHistory(travel) {
  const history = travel.places.map(() => ({ stays: [], arrivals: [] }));
  let run = null;
  for (const n of travel.calendar) {
    if (run && run.place === n.place) run.to = n.date;
    else {
      run = { place: n.place, from: n.date, to: n.date };
      history[n.place].stays.push(run);
    }
  }
  for (const f of travel.flights) history[f.to].arrivals.push(f.date);
  return history.map(({ stays, arrivals }) => ({ stays: stays.map(({ from, to }) => [from, to]), arrivals }));
}
