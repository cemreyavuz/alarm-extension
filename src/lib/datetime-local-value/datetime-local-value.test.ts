import { describe, expect, test } from "bun:test";
import { toDatetimeLocalValue } from "./index";

describe("toDatetimeLocalValue", () => {
  test("formats local calendar date and time for datetime-local input", () => {
    const d = new Date(2024, 0, 15, 9, 5);
    expect(toDatetimeLocalValue(d)).toBe("2024-01-15T09:05");
  });
});
