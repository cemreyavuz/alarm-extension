import { describe, expect, test } from "bun:test";
import { escapeHtml } from "./index";

describe("escapeHtml", () => {
  test("escapes special characters", () => {
    expect(escapeHtml(`<&>"`)).toBe("&lt;&amp;&gt;&quot;");
  });

  test("empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
