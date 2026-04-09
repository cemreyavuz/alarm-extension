import { describe, expect, test } from "bun:test";
import { toDatetimeLocalValue } from "./datetime-local-value";

describe("toDatetimeLocalValue", () => {
  test("formats local calendar date and time for datetime-local input", () => {
    const date = new Date(2024, 0, 15, 9, 5);
    expect(toDatetimeLocalValue(date)).toBe("2024-01-15T09:05");
  });
});
