import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * CSS class applied to number-highlighted spans.
 */
export const HIGHLIGHT_CLASS =
  "rounded-sm bg-primary/10 px-0.5 font-mono tabular-nums text-[0.92em] text-primary";

/**
 * Invisible Unicode markers injected by {@link preprocessHighlightSyntax}.
 *
 * C1 control characters (U+0091 / U+0092) — not whitespace, not punctuation,
 * not printable.  They won't break markdown emphasis flanking rules, so
 * `**[[564,209B]]**` → `**\u0091 564,209B\u0092 **` → bold + highlighted.
 */
const MARKER_START = "\u0091";
const MARKER_END = "\u0092";

// Pattern for matching marked spans in text nodes. Build a fresh `RegExp` per
// call (rather than reusing a module-level instance) so concurrent renders
// can't trip over each other via shared `lastIndex` state.
const MARKER_PATTERN = `${MARKER_START}([\\s\\S]*?)${MARKER_END}`;

/**
 * Preprocess raw markdown text, replacing `[[content]]%` highlight syntax with
 * invisible Unicode marker pairs.
 *
 * Must be called **before** passing text to `<ReactMarkdown>`.
 * The markers are then detected and rendered by {@link processNumberHighlights}.
 */
export function preprocessHighlightSyntax(text: string): string {
  return text.replace(
    /\[\[([^[\]]+?)\]\](%?)/g,
    (_match: string, content: string, pct: string) =>
      `${MARKER_START}${content}${pct}${MARKER_END}`,
  );
}

// ---------------------------------------------------------------------------
// Post-render tree processing — detects markers in the React node tree
// and wraps matched content in styled `<span>` elements.
// ---------------------------------------------------------------------------

/**
 * Process a single text string: replace any `MARKER_START…MARKER_END` pairs
 * with `<span>` highlight elements.  Returns the original string when no
 * markers are present.
 */
function highlightText(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  // Local regex instance — safe under concurrent rendering.
  const re = new RegExp(MARKER_PATTERN, "g");
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`${keyPrefix}-${match.index}`} className={HIGHLIGHT_CLASS}>
        {match[1]}
      </span>,
    );
    lastIndex = re.lastIndex;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length === 1 ? parts[0] : parts;
}

/**
 * Walk an array of React nodes, looking for `MARKER_START` at the tail of a
 * text node and `MARKER_END` at the head of a later text node.  When found,
 * everything between them is wrapped in a highlight `<span>`.
 *
 * This handles cases like `⟦**1,234**⟧` where the markdown parser splits
 * the markers across separate text / element nodes.
 */
function processArray(children: ReactNode[], keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i];

    // ── look for a text node that ends with (or is) MARKER_START ──
    if (typeof child === "string") {
      const markerIdx = child.lastIndexOf(MARKER_START);

      if (markerIdx !== -1) {
        // If MARKER_END is also in this same string, the whole pair can
        // be handled by highlightText (no cross-node collection needed).
        const endIdx = child.indexOf(MARKER_END, markerIdx);
        if (endIdx !== -1) {
          result.push(highlightText(child, `${keyPrefix}-${i}`));
          i += 1;
          continue;
        }

        // Emit any text before the marker.
        const prefix = child.slice(0, markerIdx);
        if (prefix) result.push(highlightText(prefix, `${keyPrefix}-${i}-pre`));

        // If the marker is mid-string, the text after it is part of the
        // highlighted content — but that's extremely unlikely because the
        // preprocessing always produces a standalone marker.  Handle it
        // gracefully anyway by collecting from the next node.

        const collected: ReactNode[] = [];
        // Text between MARKER_START and end of this string (usually empty).
        const rest = child.slice(markerIdx + 1);
        if (rest) collected.push(rest);

        let found = false;
        let j = i + 1;

        while (j < children.length) {
          const next = children[j];

          if (typeof next === "string") {
            const endIdx = next.indexOf(MARKER_END);
            if (endIdx !== -1) {
              // Found the closing marker.
              const inner = next.slice(0, endIdx);
              const suffix = next.slice(endIdx + 1);
              if (inner) collected.push(inner);

              result.push(
                <span key={`${keyPrefix}-${i}-hl`} className={HIGHLIGHT_CLASS}>
                  {collected}
                </span>,
              );
              if (suffix) {
                result.push(highlightText(suffix, `${keyPrefix}-${j}-suf`));
              }
              i = j + 1;
              found = true;
              break;
            }
            collected.push(next);
          } else {
            collected.push(next);
          }
          j++;
        }

        if (!found) {
          // No closing marker — push the MARKER_START back as literal text.
          result.push(MARKER_START);
          result.push(...collected);
          i = j;
        }
        continue;
      }
    }

    // ── normal child: recurse ──
    result.push(processNode(child, `${keyPrefix}-${i}`));
    i += 1;
  }

  return result;
}

/**
 * Recursively process a React node, replacing highlight markers with styled
 * `<span>` elements.
 */
function processNode(children: ReactNode, keyPrefix: string): ReactNode {
  if (typeof children === "string") return highlightText(children, keyPrefix);
  if (typeof children === "number" || !children) return children;

  if (Array.isArray(children)) {
    return processArray(children, keyPrefix);
  }

  if (isValidElement(children)) {
    const element = children as ReactElement<{ children?: ReactNode }>;
    return cloneElement(element, {
      children: processNode(element.props.children, keyPrefix),
    });
  }

  return children;
}

/**
 * Entry point — call on every component's `children` to detect and render
 * `[[number]]` highlights that were preprocessed into marker pairs.
 */
export function processNumberHighlights(children: ReactNode): ReactNode {
  return processNode(children, "nh");
}
