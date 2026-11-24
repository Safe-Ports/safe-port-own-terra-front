import { describe, expect, it } from "vitest";
import { boldMarkupSegments, escapeHtml } from "./safeHtml";

describe("escapeHtml", () => {
  it("escapes the characters that open tags or attributes", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;"
    );
  });

  it("turns null and undefined into an empty string and stringifies numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("boldMarkupSegments", () => {
  it("splits <b> markup into bold and plain text segments", () => {
    expect(boldMarkupSegments("<b>Ana</b> cerró la venta a <b>Luis</b> — $10")).toEqual([
      { text: "Ana", bold: true },
      { text: " cerró la venta a ", bold: false },
      { text: "Luis", bold: true },
      { text: " — $10", bold: false },
    ]);
  });

  it("keeps any other tag as literal text instead of markup", () => {
    const segments = boldMarkupSegments('<b><img src=x onerror="alert(1)"></b> apartó el lote');
    expect(segments[0]).toEqual({ text: '<img src=x onerror="alert(1)">', bold: true });
    expect(segments[1]).toEqual({ text: " apartó el lote", bold: false });
  });

  it("decodes the basic entities a backend-escaped name would carry", () => {
    expect(boldMarkupSegments("<b>&lt;script&gt; &amp; Cía</b>")).toEqual([
      { text: "<script> & Cía", bold: true },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(boldMarkupSegments(null)).toEqual([]);
    expect(boldMarkupSegments("")).toEqual([]);
  });
});
