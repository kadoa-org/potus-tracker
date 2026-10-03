import { describe, expect, test } from "bun:test";
import { buildTravel, nightsByCategory, placeHistory, shortLabel } from "./travel";

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
