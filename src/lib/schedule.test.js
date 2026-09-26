import { describe, expect, test } from "bun:test";
import { govTime, inDayOrder, isUpcoming, mergeDuplicateEvents } from "./schedule";

describe("mergeDuplicateEvents", () => {
  const game = "The President attends the University of Tennessee vs. University of Texas College Football Game";
  test("keeps the venue over the White House default for the same time and title", () => {
    const rows = [
      { id: "a", time: "2026-09-26T12:00:00+00:00", title: game, locationStr: "The White House" },
      { id: "b", time: "2026-09-26T12:00:00+00:00", title: game, locationStr: "Neyland Stadium, Knoxville, TN" },
      { id: "c", time: "2026-09-26T09:00:00+00:00", title: "Executive Time", locationStr: "The White House" },
    ];
    expect(mergeDuplicateEvents(rows).map((e) => e.id)).toEqual(["b", "c"]);
  });

  test("keeps the first row when neither location is more specific, and leaves distinct events alone", () => {
    const rows = [
      { id: "a", time: "2026-09-26T12:00:00+00:00", title: "TBD: Lunch", locationStr: "Oval Office" },
      { id: "b", time: "2026-09-26T12:00:00+00:00", title: "Lunch", locationStr: "Cabinet Room" },
      { id: "c", time: "2026-09-26T13:00:00+00:00", title: "Lunch", locationStr: "Cabinet Room" },
    ];
    expect(mergeDuplicateEvents(rows).map((e) => e.id)).toEqual(["a", "c"]);
  });
});

describe("isUpcoming", () => {
  // 20:30 UTC on 26 September 2026 is 4:30 PM in Washington (EDT).
  const now = new Date("2026-09-26T20:30:00Z");
  test("reads schedule times as Eastern wall clock", () => {
    expect(isUpcoming({ time: "2026-09-26T16:00:00+00:00" }, now)).toBe(false);
    expect(isUpcoming({ time: "2026-09-26T17:00:00+00:00" }, now)).toBe(true);
  });
  test("treats a date-only event as upcoming through its day", () => {
    expect(isUpcoming({ time: "2026-09-26T00:00:00+00:00" }, now)).toBe(true);
    expect(isUpcoming({ time: "2026-09-25T00:00:00+00:00" }, now)).toBe(false);
  });
});

describe("inDayOrder", () => {
  test("puts timed events in order and date-only events last", () => {
    const rows = [
      { id: "tbd", time: "2026-09-26T00:00:00+00:00" },
      { id: "noon", time: "2026-09-26T12:00:00+00:00" },
      { id: "eight", time: "2026-09-26T08:00:00+00:00" },
    ];
    expect(inDayOrder(rows).map((e) => e.id)).toEqual(["eight", "noon", "tbd"]);
    expect(govTime("2026-09-26T08:05:00+00:00")).toBe("8:05am");
  });
});
