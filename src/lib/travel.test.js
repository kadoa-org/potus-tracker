import { describe, expect, test } from "bun:test";
import { buildTravel, latestTrip, nextStop, nightsByCategory, placeHistory, shortLabel } from "./travel";

const ev = (iso, details, location_name, latitude, longitude) => ({ event_datetime: iso, event_details: details, location_name, latitude, longitude });
const WH = ["The White House", 38.8977, -77.0365];
const ANDREWS = ["Joint Base Andrews", 38.81, -76.87];
const PBI = ["Palm Beach International Airport", 26.68, -80.09];
const MAL = ["Mar-a-Lago", 26.677, -80.037];
const MIA = ["Miami International Airport", 25.79, -80.29];
const DORAL = ["Trump National Doral Miami", 25.81, -80.34];

describe("buildTravel", () => {
  // Friday 2 to Monday 5 October 2026: Washington, a weekend at Mar-a-Lago, then home.
  const events = [
    ev("2026-10-02T14:00:00Z", "The President arrives at Joint Base Andrews", ...ANDREWS),
    ev("2026-10-02T20:00:00Z", "The President arrives at Palm Beach International Airport", ...PBI),
    ev("2026-10-02T20:30:00Z", "The President arrives at Mar-a-Lago", ...MAL),
    ev("2026-10-04T21:00:00Z", "The President arrives at Joint Base Andrews", ...ANDREWS),
    ev("2026-10-04T21:30:00Z", "The President arrives at The White House", ...WH),
  ];

  test("joins stops within 80 km into one place and counts a flight per move between places", () => {
    const t = buildTravel(events, { from: "2026-10-02", to: "2026-10-05" });
    expect(t.flights.map((f) => [t.places[f.from].label, t.places[f.to].label])).toEqual([
      ["Washington", "Mar-a-Lago"],
      ["Mar-a-Lago", "Washington"],
    ]);
  });

  test("a night is the last place of the Eastern-time day, carried forward over days without events", () => {
    const t = buildTravel(events, { from: "2026-10-02", to: "2026-10-05" });
    expect(t.calendar.map((n) => t.places[n.place].label)).toEqual(["Mar-a-Lago", "Mar-a-Lago", "Washington", "Washington"]);
    expect(nightsByCategory(t)).toMatchObject({ maralago: 2, washington: 2 });
    expect([t.weekends, t.weekendsAtProperties]).toEqual([1, 1]);
  });

  test("groups consecutive nights into stays and records the date of each arrival", () => {
    const t = buildTravel(events, { from: "2026-10-02", to: "2026-10-05" });
    const history = placeHistory(t);
    const mal = t.places.findIndex((p) => p.label === "Mar-a-Lago");
    expect(history[mal]).toEqual({ stays: [["2026-10-02", "2026-10-03"]], arrivals: ["2026-10-02"] });
    expect(history[0].stays).toEqual([["2026-10-04", "2026-10-05"]]);
  });

  test("drops moves faster than 1,000 km/h as geocoding mix-ups", () => {
    const t = buildTravel(
      [ev("2026-10-02T14:00:00Z", "The President arrives at Joint Base Andrews", ...ANDREWS), ev("2026-10-02T14:20:00Z", "The President arrives at Palm Beach International Airport", ...PBI)],
      { from: "2026-10-02", to: "2026-10-02" },
    );
    expect(t.flights).toEqual([]);
  });

  test("a place is a Trump property only when he slept at the property, not just landed nearby", () => {
    const visit = (night) => [
      ev("2026-10-02T14:00:00Z", "The President arrives at Joint Base Andrews", ...ANDREWS),
      ev("2026-10-02T18:00:00Z", "The President arrives at Miami International Airport", ...MIA),
      ev("2026-10-02T19:00:00Z", "The President arrives somewhere", ...night),
    ];
    const property = buildTravel(visit(DORAL), { from: "2026-10-02", to: "2026-10-02" });
    expect(property.places[property.calendar[0].place]).toMatchObject({ label: "Doral", category: "property" });
    const airport = buildTravel(visit(MIA), { from: "2026-10-02", to: "2026-10-02" });
    expect(airport.places[airport.calendar[0].place].category).toBe("us");
  });
});

describe("shortLabel", () => {
  test.each([
    ["Bestepe Presidential Compound, Ankara, Turkey", "Ankara"],
    ["Four Seasons Hotel Beijing", "Beijing"],
    ["Shannon Airport, Ireland", "Shannon"],
    ["Post Oak Hotel, Houston", "Houston"],
    ["Fort Bragg, NC", "Fort Bragg"],
    ["Trump International Golf Links and Hotel Ireland, Doonbeg", "Doonbeg"],
  ])("%s is %s", (name, label) => expect(shortLabel(name)).toBe(label));
});

describe("latestTrip", () => {
  const place = (category, label) => ({ category, label });
  const places = [place("washington", "Washington"), place("us", "Dallas"), place("us", "Mobile"), place("bedminster", "Bedminster")];
  const f = (from, to, date) => ({ from, to, date });

  test("is the legs since he last left a home, oldest first", () => {
    // Washington to Dallas, on to Mobile, back to Washington: one trip. The earlier Bedminster weekend is not part of it.
    const flights = [f(0, 3, "2026-09-26"), f(3, 0, "2026-09-28"), f(0, 1, "2026-10-02"), f(1, 2, "2026-10-03"), f(2, 0, "2026-10-04")];
    expect(latestTrip({ places, flights, to: "2026-10-05" }).map((l) => [places[l.from].label, places[l.to].label])).toEqual([
      ["Washington", "Dallas"],
      ["Dallas", "Mobile"],
      ["Mobile", "Washington"],
    ]);
  });

  test("is empty when the latest flight is more than three days old, so no stale route is drawn as current", () => {
    const flights = [f(0, 1, "2026-09-29"), f(1, 0, "2026-09-30")];
    expect(latestTrip({ places, flights, to: "2026-10-06" })).toEqual([]);
    expect(latestTrip({ places, flights, to: "2026-10-03" })).toHaveLength(2);
  });

  test("stops a week before the latest flight even if he never passed through a home", () => {
    const flights = [f(1, 2, "2026-09-20"), f(2, 1, "2026-10-01"), f(1, 2, "2026-10-03")];
    expect(latestTrip({ places, flights, to: "2026-10-04" })).toHaveLength(2);
  });
});


describe("nextStop", () => {
  const here = { lat: 38.8977, lon: -77.0365 }; // The White House
  const e = (time, title, locationStr, lat, lng) => ({ time, title, locationStr, location: { lat, lng } });
  const today = [
    e("2026-10-06T00:00:00+00:00", "TBD: The President departs the White House en route Baltimore, Maryland", "The White House", 38.8977, -77.0365),
    e("2026-10-06T00:00:00+00:00", "TBD: The President arrives Baltimore, Maryland", "Sparrows Point Shipyard, Baltimore", 39.2178, -76.4744),
    e("2026-10-06T11:00:00+00:00", "The President participates in a Policy Meeting", "Oval Office", 38.8977, -77.0365),
    e("2026-10-06T16:00:00+00:00", "The President delivers Remarks", "Sparrows Point Shipyard, Baltimore", 39.2178, -76.4744),
    e("2026-10-06T23:56:00+00:00", "The President arrives at The White House", "The White House", 38.8977, -77.0365),
  ];

  test("is the first upcoming event away from where he is, with its time", () => {
    expect(nextStop(today, here, "2026-10-06T09:00")).toEqual({ lat: 39.2178, lon: -76.4744, label: "Baltimore", date: "2026-10-06", time: "2026-10-06T16:00:00+00:00" });
  });

  test("is nothing once the trip's last stop away has passed, and nothing within 30 km", () => {
    expect(nextStop(today, here, "2026-10-06T17:00")).toBeNull();
    expect(nextStop([e("2026-10-06T15:00:00+00:00", "Arrives", "Joint Base Andrews", 38.81, -76.87)], here, "2026-10-06T09:00")).toBeNull();
  });

  test("falls back to a date-only placeholder, without a time, when it is the earliest sign of the trip", () => {
    const placeholderOnly = today.filter((x) => !x.title.startsWith("The President delivers"));
    expect(nextStop(placeholderOnly, here, "2026-10-06T09:00")).toMatchObject({ label: "Baltimore", time: null });
  });
});
