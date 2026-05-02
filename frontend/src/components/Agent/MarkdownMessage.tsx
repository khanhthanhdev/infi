import {
  cloneElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
  useMemo,
} from "react";
import type { Components } from "react-markdown";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (typeof children === "object" && "props" in children) {
    const props = children.props as { children?: ReactNode };
    return extractTextFromChildren(props.children);
  }
  return "";
}

function urlTransform(url: string): string {
  if (/^wf-(table|record|doc|worker):/.test(url)) return url;
  return defaultUrlTransform(url);
}

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

function NumberHighlights({ children }: { children: ReactNode }) {
  return <>{processNumberHighlights(children)}</>;
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

interface MarkdownMessageProps {
  text: string;
  streaming?: boolean;
  workspaceId?: string;
}

function MarkdownMessage({ text }: MarkdownMessageProps) {
  const components = useMemo<Components>(() => {
    return {
      a({ href, children }) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            <NumberHighlights>{children}</NumberHighlights>
          </a>
        );
      },
      table({ children }) {
        return (
          <div className="my-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">{children}</table>
          </div>
        );
      },
      thead({ children }) {
        return <thead className="bg-muted/70">{children}</thead>;
      },
      th({ children }) {
        return (
          <th className="border-b border-border px-3 py-2 text-left text-xs font-semibold text-foreground">
            <NumberHighlights>{children}</NumberHighlights>
          </th>
        );
      },
      td({ children }) {
        return (
          <td className="border-b border-border/50 px-3 py-2 text-muted-foreground">
            <NumberHighlights>{children}</NumberHighlights>
          </td>
        );
      },
      tr({ children }) {
        return <tr className="transition-colors hover:bg-muted/30">{children}</tr>;
      },
      h1({ children }) {
        return (
          <h1 className="mt-6 mb-3 text-xl font-bold tracking-tight">
            <NumberHighlights>{children}</NumberHighlights>
          </h1>
        );
      },
      h2({ children }) {
        return (
          <h2 className="mt-5 mb-2 text-lg font-semibold tracking-tight">
            <NumberHighlights>{children}</NumberHighlights>
          </h2>
        );
      },
      h3({ children }) {
        return (
          <h3 className="mt-4 mb-2 text-base font-semibold">
            <NumberHighlights>{children}</NumberHighlights>
          </h3>
        );
      },
      blockquote({ children }) {
        return (
          <blockquote className="my-3 border-l-2 border-primary/40 pl-4 text-muted-foreground italic">
            <NumberHighlights>{children}</NumberHighlights>
          </blockquote>
        );
      },
      hr() {
        return <hr className="my-5 border-border" />;
      },
      ul({ children }) {
        return (
          <ul className="my-2 space-y-1 pl-4 list-disc marker:text-muted-foreground/50">
            {children}
          </ul>
        );
      },
      ol({ children }) {
        return (
          <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-muted-foreground/50">
            {children}
          </ol>
        );
      },
      li({ children }) {
        return (
          <li>
            <NumberHighlights>{children}</NumberHighlights>
          </li>
        );
      },
      p({ children }) {
        return (
          <p>
            <NumberHighlights>{children}</NumberHighlights>
          </p>
        );
      },
      pre({ children }) {
        const text = extractTextFromChildren(children);
        return (
          <div className="relative group/code">
            <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
              <CopyButton text={text} />
            </div>
            <pre>{children}</pre>
          </div>
        );
      },
    };
  }, []);

  return (
    <div className="w-full max-w-none text-sm leading-relaxed text-foreground">
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-p:my-1.5 prose-p:leading-relaxed",
          "prose-pre:my-2 prose-pre:bg-muted prose-pre:text-muted-foreground prose-pre:rounded-lg prose-pre:border prose-pre:border-border/50",
          "prose-code:bg-muted/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono prose-code:text-foreground",
          "prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-sm",
          "prose-li:my-0.5",
          "prose-a:text-primary prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80",
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={components}
          urlTransform={urlTransform}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default memo(MarkdownMessage);
