import { describe, expect, test } from "bun:test";
import { govDate, govDateTime } from "./feed";

describe("GOV.UK dates", () => {
  test("date and time in Washington, lowercase am and pm", () => {
    expect(govDateTime("2026-09-26T15:58:00Z")).toBe("26 September 2026 at 11:58am");
    expect(govDateTime("2026-09-26T02:05:00Z")).toBe("25 September 2026 at 10:05pm");
  });
  test("a date-only release keeps its date", () => {
    expect(govDate("2026-09-25T00:00:00+00:00")).toBe("25 September 2026");
  });
});
