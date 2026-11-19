import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape-html";

describe("escapeHtml", () => {
  it("escapes ampersands, angle brackets and both quote kinds", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
  });

  it("escapes an ampersand only once (no double encoding of the replacements)", () => {
    expect(escapeHtml("<")).toBe("&lt;");
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Ärger mit Käse")).toBe("Ärger mit Käse");
  });
});
