import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type { Components } from "react-markdown";
import { MetricExplanationTooltip } from "@/components/ui/MetricExplanationTooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MetricExplanation } from "@/types";

const TERM_ALIASES: Record<string, string[]> = {
  pe: ["P/E", "P/E ratio", "price to earnings", "price-to-earnings"],
  casa: ["CASA", "CASA ratio"],
  eps: ["EPS", "earnings per share"],
  roe: ["ROE", "return on equity"],
  roa: ["ROA", "return on assets"],
  ebitda: ["EBITDA"],
  nim: ["NIM", "net interest margin"],
  revenue: ["revenue", "sales"],
  gross_margin: ["gross margin"],
  operating_margin: ["operating margin"],
  net_margin: ["net margin"],
  free_cash_flow: ["free cash flow", "FCF"],
  dividend_yield: ["dividend yield"],
  book_value: ["book value"],
  market_cap: ["market cap", "market capitalization"],
  ev_ebitda: ["EV/EBITDA"],
  debt_to_equity: ["debt-to-equity", "debt to equity"],
  loan_to_deposit: ["loan-to-deposit", "loan to deposit", "LDR"],
  non_performing_loan: ["non-performing loan", "NPL"],
  net_profit: ["net profit", "net income"],
};

function highlightNumberText(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /\[\[([^[\]]+?)\]\](%?)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <span
        key={`${keyPrefix}-${match.index}`}
        className="rounded-sm bg-primary/10 px-0.5 font-mono tabular-nums text-[0.92em] text-primary"
      >
        {match[1]}
        {match[2]}
      </span>,
    );
    lastIndex = pattern.lastIndex;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function processNumberHighlights(children: ReactNode): ReactNode {
  if (typeof children === "string") return highlightNumberText(children, "number");
  if (Array.isArray(children)) {
    return children.map((child, index) => processNumberHighlightsWithKey(child, `number-${index}`));
  }
  if (isValidElement(children)) {
    const element = children as ReactElement<{ children?: ReactNode }>;
    return cloneElement(element, {
      children: processNumberHighlights(element.props.children),
    });
  }
  return children;
}

function processNumberHighlightsWithKey(children: ReactNode, keyPrefix: string): ReactNode {
  if (typeof children === "string") return highlightNumberText(children, keyPrefix);
  return processNumberHighlights(children);
}

function processHighlights(children: ReactNode, explanations: MetricExplanation[]): ReactNode {
  if (Array.isArray(children)) {
    return children.map((child) => processHighlights(child, explanations));
  }
  if (isValidElement(children)) {
    const element = children as ReactElement<{ children?: ReactNode }>;
    return cloneElement(element, {
      children: processHighlights(element.props.children, explanations),
    });
  }
  if (typeof children !== "string") return processNumberHighlights(children);

  const termExplanations = new Map(
    explanations.filter((e) => e.target_type === "term").map((e) => [e.target_key, e]),
  );
  if (termExplanations.size === 0) return processNumberHighlights(children);

  const aliases = Array.from(termExplanations.entries())
    .flatMap(([key, explanation]) => {
      const knownAliases = TERM_ALIASES[key] ?? [
        explanation.display_name || explanation.metric_name,
      ];
      return knownAliases.map((alias) => ({ alias, explanation }));
    })
    .filter(({ alias }) => alias.trim().length > 0)
    .sort((a, b) => b.alias.length - a.alias.length);

  if (aliases.length === 0) return processNumberHighlights(children);

  const pattern = new RegExp(
    `(?<![\\w/])(${aliases.map(({ alias }) => escapeRegExp(alias)).join("|")})(?![\\w/])`,
    "gi",
  );
  const numberParts = children.split(/(\[\[[^[\]]+?\]\]%?)/g);

  return numberParts.flatMap((part, partIndex) => {
    if (part.startsWith("[[") && (part.endsWith("]]") || part.endsWith("]]%"))) {
      return processNumberHighlightsWithKey(part, `number-${partIndex}`);
    }

    return part.split(pattern).map((piece, pieceIndex) => {
      const match = aliases.find(({ alias }) => alias.toLowerCase() === piece.toLowerCase());
      if (!match) return piece;
      return (
        <MetricExplanationTooltip
          key={`${partIndex}-${pieceIndex}-${piece}`}
          explanation={match.explanation}
        >
          <span className="cursor-help underline decoration-dotted underline-offset-2">
            {piece}
          </span>
        </MetricExplanationTooltip>
      );
    });
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function TextWithHighlights({
  children,
  explanations = [],
}: {
  children: ReactNode;
  explanations?: MetricExplanation[];
}) {
  return <>{processHighlights(children, explanations)}</>;
}

export const reportMarkdownComponents: Components = {
  table: ({ children }) => <Table className="text-[13px]">{children}</Table>,
  thead: ({ children }) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow className="border-b border-border/60">{children}</TableRow>,
  th: ({ children }) => (
    <TableHead className="px-3 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </TableHead>
  ),
  td: ({ children }) => (
    <TableCell className="px-3">
      <TextWithHighlights>{children}</TextWithHighlights>
    </TableCell>
  ),
  p: ({ children }) => (
    <p className="leading-[1.65]">
      <TextWithHighlights>{children}</TextWithHighlights>
    </p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 pl-0 [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-1 [&>li]:before:top-[0.7em] [&>li]:before:h-1 [&>li]:before:w-1 [&>li]:before:rounded-full [&>li]:before:bg-foreground/50">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-[0.85em] marker:tabular-nums marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-[1.6]">
      <TextWithHighlights>{children}</TextWithHighlights>
    </li>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-foreground underline decoration-border decoration-1 underline-offset-[3px] transition-colors hover:decoration-foreground"
    >
      <TextWithHighlights>{children}</TextWithHighlights>
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-foreground/30 pl-4 text-muted-foreground">
      <TextWithHighlights>{children}</TextWithHighlights>
    </blockquote>
  ),
  h1: ({ children }) => (
    <h1 className="pt-2 text-lg font-semibold tracking-tight">
      <TextWithHighlights>{children}</TextWithHighlights>
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="pt-2 text-[15px] font-semibold tracking-tight">
      <TextWithHighlights>{children}</TextWithHighlights>
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold">
      <TextWithHighlights>{children}</TextWithHighlights>
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
      <TextWithHighlights>{children}</TextWithHighlights>
    </h4>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return <code className={`${className ?? ""} block`}>{children}</code>;
    }
    return (
      <code className="bg-muted px-1 py-0.5 font-mono text-[0.88em] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto border border-border bg-muted/40 p-3 font-mono text-xs">
      {children}
    </pre>
  ),
};

export function createReportMarkdownComponents(explanations: MetricExplanation[] = []): Components {
  return {
    ...reportMarkdownComponents,
    td: ({ children }) => (
      <TableCell className="px-3">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </TableCell>
    ),
    p: ({ children }) => (
      <p className="leading-[1.65]">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </p>
    ),
    li: ({ children }) => (
      <li className="leading-[1.6]">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-foreground/30 pl-4 text-muted-foreground">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </blockquote>
    ),
    h1: ({ children }) => (
      <h1 className="pt-2 text-lg font-semibold tracking-tight">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="pt-2 text-[15px] font-semibold tracking-tight">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-[14px] font-semibold">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <TextWithHighlights explanations={explanations}>{children}</TextWithHighlights>
      </h4>
    ),
  };
}
