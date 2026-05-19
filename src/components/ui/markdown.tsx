import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  CodeBlock — used as the custom renderer for fenced code blocks.   */
/* ------------------------------------------------------------------ */

export interface CodeBlockProps {
  code: string;
  lang?: string;
}

export function CodeBlock({ code, lang }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative my-xs max-w-full rounded border border-border bg-surface overflow-hidden not-prose">
      <div className="flex items-center justify-between gap-sm px-sm py-xs border-b border-border bg-surface-alt/40">
        <span className="text-body-sm font-mono text-foreground-muted">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className={cn(
            "inline-flex items-center gap-xs px-sm py-xs rounded",
            "text-body-sm text-foreground-muted hover:text-foreground",
            "hover:bg-surface/60 transition-colors duration-hover",
          )}
        >
          {copied ? (
            <Check className="size-3.5 text-primary" />
          ) : (
            <Copy className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-md py-sm text-code font-mono text-foreground overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown wrapper                                                   */
/* ------------------------------------------------------------------ */

export interface MarkdownProps {
  children: string;
  className?: string;
}

const PROSE_CLASSES = [
  "prose prose-invert max-w-none",
  "prose-headings:font-headline prose-headings:text-foreground",
  "prose-p:text-foreground prose-li:text-foreground",
  "prose-strong:text-foreground prose-em:text-foreground",
  "prose-a:text-primary hover:prose-a:text-primary-hover prose-a:no-underline hover:prose-a:underline",
  "prose-code:text-foreground prose-code:bg-surface/80 prose-code:rounded",
  "prose-code:px-1.5 prose-code:py-[1px] prose-code:font-mono prose-code:text-code",
  "prose-code:before:content-none prose-code:after:content-none",
  "prose-blockquote:border-border prose-blockquote:text-foreground-muted",
  "prose-hr:border-border",
  "prose-table:text-foreground prose-th:text-foreground prose-td:text-foreground",
  "prose-pre:bg-transparent prose-pre:p-0",
].join(" ");

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    const props = (children as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn(PROSE_CLASSES, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Strip the default <pre> wrapper; our CodeBlock provides its own.
          pre: ({ children: c }) => <>{c}</>,
          code: ({ className: codeClassName, children: codeChildren }) => {
            const raw = extractText(codeChildren);
            const match = /language-(\w+)/.exec(codeClassName ?? "");
            const isBlock = !!match || raw.includes("\n");
            if (isBlock) {
              return (
                <CodeBlock
                  code={raw.replace(/\n$/, "")}
                  lang={match?.[1]}
                />
              );
            }
            return (
              <code
                className={cn(
                  "rounded bg-surface/80 px-1.5 py-[1px]",
                  "font-mono text-code text-foreground",
                )}
              >
                {codeChildren}
              </code>
            );
          },
          a: ({ href, children: c }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary hover:text-primary-hover hover:underline"
            >
              {c}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
