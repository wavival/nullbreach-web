import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Code,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { request } from "@/services/api";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/lib/errors";
import { useError } from "@/hooks/useError";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Markdown } from "@/components/ui/markdown";
import { InlineError } from "@/components/ui/InlineError";

interface AnalyzeRequest {
  code: string;
  language?: string;
}

interface AnalyzeResponse {
  analysis?: string;
  result?: string;
  summary?: string;
  vulnerabilities?: Vulnerability[];
}

type Severity = "critical" | "high" | "medium" | "low";

interface Vulnerability {
  title: string;
  severity?: Severity;
  description?: string;
  line?: number;
}

const LANGUAGES = [
  "auto",
  "python",
  "javascript",
  "typescript",
  "go",
  "java",
  "c",
  "cpp",
  "rust",
  "php",
  "ruby",
] as const;

type Language = (typeof LANGUAGES)[number];

const LANGUAGE_META: Record<Language, { label: string; icon: string }> = {
  auto: { label: "Auto-detect", icon: "✨" },
  python: { label: "Python", icon: "🐍" },
  javascript: { label: "JavaScript", icon: "📜" },
  typescript: { label: "TypeScript", icon: "📘" },
  go: { label: "Go", icon: "🔷" },
  java: { label: "Java", icon: "☕" },
  c: { label: "C", icon: "⚙️" },
  cpp: { label: "C++", icon: "⚙️" },
  rust: { label: "Rust", icon: "🦀" },
  php: { label: "PHP", icon: "🐘" },
  ruby: { label: "Ruby", icon: "💎" },
};

/* Heuristic source-language detection. Best-effort keyword scoring — not a
   real parser, just enough to flag an obvious selected/pasted mismatch. */
function detectLanguage(code: string): Language | null {
  const c = code;
  if (c.trim().length < 8) return null;
  const scores: Partial<Record<Language, number>> = {};
  const add = (lang: Language, n: number) => {
    scores[lang] = (scores[lang] ?? 0) + n;
  };

  if (/\bdef\s+\w+\s*\(.*\)\s*:/.test(c)) add("python", 3);
  if (/\b(elif|None|True|False)\b/.test(c) || /\bprint\s*\(/.test(c)) add("python", 1);

  if (/\b(const|let)\s+\w+/.test(c) || /=>/.test(c)) {
    add("javascript", 1);
    add("typescript", 1);
  }
  if (/\b(function|console\.log)\b/.test(c)) {
    add("javascript", 1);
    add("typescript", 1);
  }
  if (/:\s*(string|number|boolean|void|any|unknown)\b/.test(c)) add("typescript", 3);
  if (/\b(interface|type)\s+\w+\s*[={<]/.test(c)) add("typescript", 3);

  if (/\bpackage\s+\w+/.test(c) && /\bfunc\s+\w+/.test(c)) add("go", 4);
  if (/:=/.test(c)) add("go", 2);

  if (/\bpublic\s+(class|static)\b/.test(c)) add("java", 3);
  if (/\bSystem\.out\./.test(c) || /\bimport\s+java\./.test(c)) add("java", 2);

  if (/#include\s*<\w+\.h>/.test(c)) add("c", 2);
  if (/#include\s*<(iostream|vector|string)>/.test(c) || /\bstd::/.test(c) || /\bcout\s*<</.test(c))
    add("cpp", 4);
  if (/\bint\s+main\s*\(/.test(c)) {
    add("c", 1);
    add("cpp", 1);
  }
  if (/\bprintf\s*\(/.test(c)) add("c", 1);

  if (/\bfn\s+\w+\s*\(/.test(c)) add("rust", 2);
  if (/\blet\s+mut\b/.test(c) || /\bprintln!\s*\(/.test(c) || /\buse\s+std::/.test(c))
    add("rust", 3);

  if (/<\?php/.test(c)) add("php", 5);
  if (/\$\w+\s*=/.test(c) || /\becho\s+/.test(c)) add("php", 1);

  if (/\bputs\s+/.test(c)) add("ruby", 2);
  if (/\brequire\s+['"]/.test(c) || /\bdo\s*\|[^|]*\|/.test(c)) add("ruby", 2);

  let best: Language | null = null;
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores) as [Language, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  return bestScore >= 2 ? best : null;
}

const SEVERITY_CLASSES: Record<Severity, string> = {
  critical: "border-severity-critical text-severity-critical bg-severity-critical/10",
  high: "border-severity-high text-severity-high bg-severity-high/10",
  medium: "border-severity-medium text-severity-medium bg-severity-medium/10",
  low: "border-severity-low text-severity-low bg-severity-low/10",
};

export function Analyzer() {
  usePageTitle("Analyzer");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { showError, showSuccess } = useError();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const submit = useCallback(async () => {
    const trimmed = code.trim();
    setValidationError(null);
    if (trimmed.length === 0) {
      const msg = "Empty code";
      setValidationError(msg);
      showError(msg);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    try {
      const data = await request<AnalyzeResponse>({
        url: "/analyzer/scan/",
        method: "POST",
        data: {
          code: trimmed,
          ...(language !== "auto" ? { language } : {}),
        } satisfies AnalyzeRequest,
        silent: true,
        signal: abortControllerRef.current.signal,
      });
      setResult(data);
      showSuccess("Analysis complete");
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      const parsed = parseApiError(err);
      const friendly =
        parsed.status >= 500
          ? parsed.message
          : "Error analyzing code";
      setError(friendly);
      showError(friendly);
    } finally {
      setLoading(false);
    }
  }, [code, language, showError, showSuccess]);

  const detected = useMemo(() => detectLanguage(code), [code]);
  const canSubmit = code.trim().length > 0 && !loading;

  return (
    <div className="flex flex-col gap-xl animate-fade-in-up">
      <header className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm text-foreground-muted">
          <ShieldCheck className="size-4 text-primary" />
          <span className="text-body-sm">Static analysis</span>
        </div>
        <h1 className="font-headline text-h1 text-foreground">
          Code Analyzer
        </h1>
        <p className="text-body text-foreground-muted max-w-[640px]">
          Paste source code to detect vulnerabilities, bad practices, and
          possible attack vectors.
        </p>
      </header>

      <section
        className={cn(
          "rounded border border-border/70 bg-surface-alt/40 backdrop-blur-xl",
          "p-lg flex flex-col gap-md",
        )}
      >
        <div className="flex flex-col sm:flex-row gap-sm sm:items-center sm:justify-between">
          <label
            htmlFor="analyzer-code"
            className="text-body font-medium text-foreground flex items-center gap-sm"
          >
            <Code className="size-4 text-primary" />
            Source code
          </label>
          <LanguageSelect
            value={language}
            onChange={setLanguage}
            disabled={loading}
          />
        </div>

        <textarea
          id="analyzer-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={loading}
          spellCheck={false}
          placeholder="// Paste your code here..."
          rows={14}
          className={cn(
            "w-full resize-y rounded p-md",
            "bg-surface border",
            "font-mono text-code text-foreground placeholder:text-foreground-muted",
            "focus:outline-none",
            "transition-all duration-hover ease-hover",
            validationError
              ? "border-error focus:border-error focus:shadow-[0_0_0_4px_rgba(255,139,124,0.15)]"
              : "border-border focus:border-primary focus:shadow-[0_0_0_4px_rgba(34,197,94,0.18)]",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          )}
        />

        {validationError && (
          <InlineError message={validationError} />
        )}

        {code.trim().length > 0 && (
          <LanguageMatchBadge detected={detected} selected={language} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
          <p className="text-body-sm text-foreground-muted">
            {code.length} characters
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "h-11 px-lg rounded inline-flex items-center justify-center gap-sm",
              "bg-primary text-primary-foreground font-medium",
              "transition-all duration-hover ease-hover",
              "hover:brightness-110 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.55)]",
              "active:brightness-90 active:scale-[0.99]",
              "disabled:bg-disabled disabled:opacity-50 disabled:cursor-not-allowed",
              "disabled:hover:shadow-none disabled:hover:brightness-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            )}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </section>

      {loading && <LoadingPanel />}

      {error && !loading && (
        <InlineError message={error} onRetry={submit} />
      )}

      {result && !loading && !error && <ResultPanel result={result} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface LanguageSelectProps {
  value: Language;
  onChange: (next: Language) => void;
  disabled?: boolean;
}

function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(() =>
    LANGUAGES.indexOf(value),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const triggerId = "analyzer-language-trigger";
  const listId = "analyzer-language-list";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = LANGUAGES.indexOf(value);
    setActiveIdx(idx >= 0 ? idx : 0);
  }, [open, value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  function commit(next: Language) {
    onChange(next);
    setOpen(false);
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % LANGUAGES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + LANGUAGES.length) % LANGUAGES.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(LANGUAGES.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const next = LANGUAGES[activeIdx];
      if (next) commit(next);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const meta = LANGUAGE_META[value];

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        id={triggerId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label="Language"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        className={cn(
          "w-full sm:w-[200px] inline-flex items-center justify-between gap-sm",
          "rounded text-body text-foreground",
          "border bg-surface-alt",
          "transition-all duration-hover ease-hover",
          "cursor-pointer",
          "focus:outline-none",
          open
            ? "border-primary shadow-[0_0_0_4px_rgba(34,197,94,0.18)]"
            : "border-border hover:border-neutral hover:bg-surface",
          "focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_rgba(34,197,94,0.18)]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-surface-alt",
        )}
        style={{ padding: "10px 12px" }}
      >
        <span className="inline-flex items-center gap-sm min-w-0">
          <span aria-hidden="true" className="text-base leading-none">
            {meta.icon}
          </span>
          <span className="truncate">{meta.label}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 shrink-0 text-foreground-muted",
            "transition-transform duration-hover ease-hover",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={triggerId}
          aria-activedescendant={`${listId}-opt-${activeIdx}`}
          onKeyDown={onListKey}
          className={cn(
            "absolute z-50 mt-xs w-full sm:w-[220px] left-0",
            "rounded border border-border bg-surface-alt shadow-medium",
            "py-xs max-h-[280px] overflow-y-auto",
            "animate-fade-in focus:outline-none",
          )}
        >
          {LANGUAGES.map((lang, idx) => {
            const m = LANGUAGE_META[lang];
            const selected = lang === value;
            const active = idx === activeIdx;
            return (
              <li
                key={lang}
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={selected}
                data-idx={idx}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => commit(lang)}
                className={cn(
                  "flex items-center gap-sm px-md py-sm cursor-pointer",
                  "text-body text-foreground",
                  "transition-colors duration-hover ease-hover",
                  active && "bg-border",
                  selected && "text-primary font-medium",
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {m.icon}
                </span>
                <span className="truncate">{m.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface LanguageMatchBadgeProps {
  detected: Language | null;
  selected: Language;
}

function LanguageMatchBadge({ detected, selected }: LanguageMatchBadgeProps) {
  if (!detected) {
    return (
      <div className="rounded border border-border bg-surface px-md py-sm text-body-sm text-foreground-muted">
        Could not detect the language automatically.
      </div>
    );
  }

  const detectedLabel = LANGUAGE_META[detected].label;
  const match = selected === "auto" || selected === detected;

  if (match) {
    return (
      <div className="rounded border border-severity-low bg-severity-low/10 px-md py-sm text-body-sm text-severity-low flex items-center gap-sm">
        <span aria-hidden="true">✓</span>
        <span>
          {selected === "auto"
            ? `Detected language: ${detectedLabel}`
            : "Language matches the code."}
        </span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="rounded border border-severity-medium bg-severity-medium/10 px-md py-sm text-body-sm text-severity-medium flex items-center gap-sm"
    >
      <span aria-hidden="true">⚠️</span>
      <span>
        Detected: {detectedLabel} | Selected:{" "}
        {LANGUAGE_META[selected].label}
      </span>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div
      className={cn(
        "rounded border border-border/70 bg-surface-alt/40 backdrop-blur-xl",
        "p-xl flex flex-col items-center justify-center gap-md",
        "animate-fade-in",
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-body text-foreground-muted">
        Analyzing code. This may take a few seconds…
      </p>
    </div>
  );
}

function ResultPanel({ result }: { result: AnalyzeResponse }) {
  const text =
    result.analysis ?? result.result ?? result.summary ?? "";
  const vulns = result.vulnerabilities ?? [];
  return (
    <section
      className={cn(
        "rounded border border-border/70 bg-surface-alt/40 backdrop-blur-xl",
        "p-lg flex flex-col gap-md animate-fade-in-up",
      )}
    >
      <header className="flex items-center gap-sm">
        <div className="size-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <ShieldCheck className="size-4 text-primary" />
        </div>
        <h2 className="font-headline text-h4 text-foreground">Result</h2>
      </header>

      {vulns.length > 0 && (
        <ul className="flex flex-col gap-sm">
          {vulns.map((v, i) => (
            <li key={i}>
              <VulnCard vuln={v} />
            </li>
          ))}
        </ul>
      )}

      {text && (
        <div className="rounded border border-border bg-surface px-md py-sm">
          <Markdown>{text}</Markdown>
        </div>
      )}

      {!text && vulns.length === 0 && (
        <p className="text-body-sm text-foreground-muted">
          No findings. The analyzer returned no results.
        </p>
      )}
    </section>
  );
}

function VulnCard({ vuln }: { vuln: Vulnerability }) {
  const sev = vuln.severity ?? "medium";
  return (
    <div
      className={cn(
        "rounded border p-md flex flex-col gap-xs",
        SEVERITY_CLASSES[sev],
      )}
    >
      <div className="flex items-center justify-between gap-sm">
        <p className="font-medium text-foreground">{vuln.title}</p>
        <span
          className={cn(
            "text-body-sm font-medium uppercase tracking-wide rounded px-sm py-[2px]",
            "border",
            SEVERITY_CLASSES[sev],
          )}
        >
          {sev}
        </span>
      </div>
      {typeof vuln.line === "number" && (
        <p className="text-body-sm text-foreground-muted">Line {vuln.line}</p>
      )}
      {vuln.description && (
        <p className="text-body-sm text-foreground">{vuln.description}</p>
      )}
    </div>
  );
}

