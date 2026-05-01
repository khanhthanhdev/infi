import type { Components } from "react-markdown";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function processNumberHighlights(children: ReactNode): ReactNode {
  if (typeof children !== "string") return children;

  const parts = children.split(/(\[\[.*?\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const numericContent = part.slice(2, -2);
      return (
        <span
          key={i}
          className="rounded-sm bg-primary/10 px-0.5 font-mono tabular-nums text-[0.92em] text-primary"
        >
          {numericContent}
        </span>
      );
    }
    return part;
  });
}

function TextWithHighlights({ children }: { children: ReactNode }) {
  return <>{processNumberHighlights(children)}</>;
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
  td: ({ children }) => <TableCell className="px-3"><TextWithHighlights>{children}</TextWithHighlights></TableCell>,
  p: ({ children }) => <p className="leading-[1.65]"><TextWithHighlights>{children}</TextWithHighlights></p>,
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
  li: ({ children }) => <li className="leading-[1.6]"><TextWithHighlights>{children}</TextWithHighlights></li>,
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
    <blockquote className="border-l-2 border-foreground/30 pl-4 text-muted-foreground"><TextWithHighlights>{children}</TextWithHighlights></blockquote>
  ),
  h1: ({ children }) => <h1 className="pt-2 text-lg font-semibold tracking-tight"><TextWithHighlights>{children}</TextWithHighlights></h1>,
  h2: ({ children }) => (
    <h2 className="pt-2 text-[15px] font-semibold tracking-tight"><TextWithHighlights>{children}</TextWithHighlights></h2>
  ),
  h3: ({ children }) => <h3 className="text-[14px] font-semibold"><TextWithHighlights>{children}</TextWithHighlights></h3>,
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
