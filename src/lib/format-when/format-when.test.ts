import { describe, expect, test } from "bun:test";
import { formatWhen } from "./index";

describe("formatWhen", () => {
  test("returns a non-empty string for a timestamp", () => {
    expect(formatWhen(1_700_000_000_000).length).toBeGreaterThan(0);
  });
});
