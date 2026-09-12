import { describe, expect, test } from "bun:test";
import { hasMapCoordinates } from "./location";

describe("hasMapCoordinates", () => {
  test("accepts numeric coordinates, including zero and boundary values", () => {
    for (const location of [{ lat: 0, lon: 0 }, { lat: 53.366, lon: -6.357 }, { lat: -90, lon: 180 }]) {
      expect(hasMapCoordinates(location)).toBe(true);
    }
  });

  test("rejects missing or unusable coordinates before formatting or mapping", () => {
    for (const location of [null, {}, { lat: null, lon: null }, { lat: 53, lon: null },
      { lat: null, lon: -6 }, { lat: "53", lon: "-6" }, { lat: NaN, lon: 0 },
      { lat: 0, lon: Infinity }, { lat: 91, lon: 0 }, { lat: 0, lon: -181 }]) {
      expect(hasMapCoordinates(location)).toBe(false);
    }
  });
});
