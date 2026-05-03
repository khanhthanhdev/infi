import React from "react";
import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT_CLASS,
  preprocessHighlightSyntax,
  processNumberHighlights,
} from "./markdown-highlights";

// Unicode markers used by the implementation.
const M_START = "\u0091";
const M_END = "\u0092";

/** Minimal shape for inspecting React elements in tests. */
interface TestElement {
  type: string;
  props: Record<string, unknown>;
  key: string | null;
}

// ---------------------------------------------------------------------------
// preprocessHighlightSyntax — pure function tests
// ---------------------------------------------------------------------------

describe("preprocessHighlightSyntax", () => {
  it("replaces a simple [[number]] with marker pair", () => {
    expect(preprocessHighlightSyntax("[[1,234]]")).toBe(`${M_START}1,234${M_END}`);
  });

  it("captures a trailing percent sign after ]]", () => {
    // [[50]]% → content=50, trailing=% → "50%"
    expect(preprocessHighlightSyntax("[[50]]%")).toBe(`${M_START}50%${M_END}`);
  });

  it("keeps percent inside the brackets as content", () => {
    // [[50%]] → content=50%, no trailing
    expect(preprocessHighlightSyntax("[[50%]]")).toBe(`${M_START}50%${M_END}`);
  });

  it("when percent is both inside and outside, both appear", () => {
    // [[50%]]% → content=50%, trailing=% → "50%%"
    expect(preprocessHighlightSyntax("[[50%]]%")).toBe(`${M_START}50%%${M_END}`);
  });

  it("handles multiple highlights in one string", () => {
    const input = "Revenue was [[1,234]] and margin was [[50]]%";
    expect(preprocessHighlightSyntax(input)).toBe(
      `Revenue was ${M_START}1,234${M_END} and margin was ${M_START}50%${M_END}`,
    );
  });

  it("returns the string unchanged when there are no highlights", () => {
    const input = "No highlights here, just plain text.";
    expect(preprocessHighlightSyntax(input)).toBe(input);
  });

  it("ignores unclosed [[ markers", () => {
    expect(preprocessHighlightSyntax("See [[section 2 for details")).toBe(
      "See [[section 2 for details",
    );
  });

  it("ignores unmatched ]] markers", () => {
    expect(preprocessHighlightSyntax("Random ]] brackets")).toBe("Random ]] brackets");
  });

  it("does not match empty brackets [[]]", () => {
    expect(preprocessHighlightSyntax("[[]]")).toBe("[[]]");
  });

  it("handles adjacent highlights", () => {
    expect(preprocessHighlightSyntax("[[a]][[b]]")).toBe(`${M_START}a${M_END}${M_START}b${M_END}`);
  });

  it("handles decimal numbers", () => {
    expect(preprocessHighlightSyntax("[[3.14]]")).toBe(`${M_START}3.14${M_END}`);
  });

  it("handles negative numbers", () => {
    expect(preprocessHighlightSyntax("[[-15.3]]%")).toBe(`${M_START}-15.3%${M_END}`);
  });

  it("handles currency symbols", () => {
    expect(preprocessHighlightSyntax("[[$100M]]")).toBe(`${M_START}$100M${M_END}`);
  });

  it("handles highlights surrounded by normal text", () => {
    const input = "The value is [[1,234.56]] which is significant.";
    expect(preprocessHighlightSyntax(input)).toBe(
      `The value is ${M_START}1,234.56${M_END} which is significant.`,
    );
  });

  it("handles highlights in parentheses with trailing percent", () => {
    expect(preprocessHighlightSyntax("The result ([[42]])% was expected.")).toBe(
      `The result (${M_START}42${M_END})% was expected.`,
    );
  });

  it("handles trailing percent directly after ]]", () => {
    expect(preprocessHighlightSyntax("The result ([[42]]%) was expected.")).toBe(
      `The result (${M_START}42%${M_END}) was expected.`,
    );
  });

  it("preserves single brackets", () => {
    expect(preprocessHighlightSyntax("text with [single] brackets")).toBe(
      "text with [single] brackets",
    );
  });

  it("handles empty string", () => {
    expect(preprocessHighlightSyntax("")).toBe("");
  });

  it("does not break markdown emphasis around highlights", () => {
    // The key case: **[[564,209B]]** should keep the ** intact
    // so the markdown parser can still see them as bold delimiters.
    const result = preprocessHighlightSyntax("**[[564,209B]]**");
    expect(result).toBe(`**${M_START}564,209B${M_END}**`);
    // Verify the ** are NOT inside the markers
    expect(result.startsWith("**")).toBe(true);
    expect(result.endsWith("**")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// processNumberHighlights — React tree processing tests
// ---------------------------------------------------------------------------

describe("processNumberHighlights", () => {
  it("returns non-string primitives unchanged", () => {
    expect(processNumberHighlights(42)).toBe(42);
    expect(processNumberHighlights(null)).toBe(null);
    expect(processNumberHighlights(undefined)).toBe(undefined);
    expect(processNumberHighlights(true)).toBe(true);
  });

  it("returns plain text unchanged", () => {
    expect(processNumberHighlights("hello world")).toBe("hello world");
  });

  it("wraps marked text in a styled span", () => {
    const input = `Revenue was ${M_START}1,234${M_END} this quarter.`;
    const result = processNumberHighlights(input);

    // Should return an array: ["Revenue was ", <span>1,234</span>, " this quarter."]
    expect(Array.isArray(result)).toBe(true);
    const arr = result as React.ReactNode[];

    expect(arr[0]).toBe("Revenue was ");
    // arr[1] should be a React element (span)
    expect(arr[1]).toHaveProperty("type", "span");
    expect(arr[1]).toHaveProperty("props.className", HIGHLIGHT_CLASS);
    expect(arr[1]).toHaveProperty("props.children", "1,234");
    expect(arr[2]).toBe(" this quarter.");
  });

  it("handles multiple markers in one string", () => {
    const input = `${M_START}100${M_END} and ${M_START}200${M_END}`;
    const result = processNumberHighlights(input) as React.ReactNode[];

    // [<span>100</span>, " and ", <span>200</span>]
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty("props.children", "100");
    expect(result[1]).toBe(" and ");
    expect(result[2]).toHaveProperty("props.children", "200");
  });

  it("processes arrays recursively", () => {
    const input = ["prefix ", `${M_START}42${M_END}`, " suffix"];
    const result = processNumberHighlights(input) as React.ReactNode[];

    expect(result[0]).toBe("prefix ");
    expect(result[1]).toHaveProperty("props.children", "42");
    expect(result[2]).toBe(" suffix");
  });

  it("recurses into React elements", () => {
    const inner = `bold ${M_START}99${M_END} text`;
    const element = React.createElement("strong", null, inner);
    const result = processNumberHighlights(element) as unknown as TestElement;

    expect(result.type).toBe("strong");
    // Children should be processed
    const children = result.props.children as React.ReactNode[];
    expect(Array.isArray(children)).toBe(true);
    expect(children[0]).toBe("bold ");
    expect(children[1]).toHaveProperty("props.children", "99");
    expect(children[2]).toBe(" text");
  });

  it("handles cross-node markers (bold inside highlight)", () => {
    // Simulates: [[**564,209B**]] → markers split across nodes
    // After markdown parsing: [M_START, <strong>564,209B</strong>, M_END]
    const input = [M_START, React.createElement("strong", null, "564,209B"), M_END];
    const result = processNumberHighlights(input) as React.ReactNode[];

    // Should produce a single <span> wrapping the <strong>
    expect(result).toHaveLength(1);
    const span = result[0] as unknown as TestElement;
    expect(span.type).toBe("span");
    expect(span.props.className).toBe(HIGHLIGHT_CLASS);

    // Children should be the <strong> element (wrapped in array)
    const innerStrong = (span.props.children as unknown as TestElement[])[0];
    expect(innerStrong.type).toBe("strong");
    expect(innerStrong.props.children).toBe("564,209B");
  });

  it("handles plain text with no markers", () => {
    expect(processNumberHighlights("no markers here")).toBe("no markers here");
  });
});

// ---------------------------------------------------------------------------
// Integration: preprocess → processNumberHighlights
// ---------------------------------------------------------------------------

describe("preprocessing + processing integration", () => {
  it.each([
    { input: "[[50]]%", expected: "50%", desc: "trailing percent" },
    { input: "[[-3.2]]", expected: "-3.2", desc: "negative decimal" },
    { input: "[[$100M]]", expected: "$100M", desc: "currency" },
    { input: "[[50%]]", expected: "50%", desc: "percent inside" },
    { input: "[[1,234,567]]", expected: "1,234,567", desc: "commas" },
  ])("round-trip for $desc: '$input'", ({ input, expected }) => {
    const preprocessed = preprocessHighlightSyntax(input);
    const result = processNumberHighlights(preprocessed) as React.ReactNode[];

    // Single marker pair → produces a <span>
    const span = Array.isArray(result) ? result[0] : result;
    expect(span).toHaveProperty("type", "span");
    expect(span).toHaveProperty("props.className", HIGHLIGHT_CLASS);
    expect(span).toHaveProperty("props.children", expected);
  });

  it("bold around highlight preserves emphasis and highlight", () => {
    // **[[564,209B]]** → **M_START 564,209B M_END**
    // After markdown parsing: <strong>M_START 564,209B M_END</strong>
    // processNumberHighlights wraps the markers in a span inside the strong
    const preprocessed = preprocessHighlightSyntax("**[[564,209B]]**");
    expect(preprocessed).toBe(`**${M_START}564,209B${M_END}**`);

    // Simulate what the markdown parser produces:
    // The ** are parsed as bold, the markers are text inside the bold.
    const markdownTree = React.createElement("strong", null, `${M_START}564,209B${M_END}`);
    const result = processNumberHighlights(markdownTree) as unknown as TestElement;

    // Should be <strong><span class="nh">564,209B</span></strong>
    expect(result.type).toBe("strong");
    const span = result.props.children as unknown as TestElement;
    expect(span.type).toBe("span");
    expect(span.props.className).toBe(HIGHLIGHT_CLASS);
    expect(span.props.children).toBe("564,209B");
  });
});
