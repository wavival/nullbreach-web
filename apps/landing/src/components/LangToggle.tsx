import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

type Lang = "es" | "en";
const STORAGE_KEY = "nb_lang";

/**
 * The one interactive part of the landing. Flips <html data-lang> (and lang)
 * so the CSS in global.css swaps which language renders. Persists to
 * localStorage. Rendered as a React island via `client:load`.
 */
export default function LangToggle() {
  const [lang, setLang] = useState<Lang>("es");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial: Lang = saved === "en" ? "en" : "es";
    apply(initial);
    setLang(initial);
  }, []);

  function apply(l: Lang) {
    const el = document.documentElement;
    el.dataset.lang = l;
    el.lang = l;
    localStorage.setItem(STORAGE_KEY, l);
  }

  function choose(l: Lang) {
    setLang(l);
    apply(l);
  }

  return (
    <div
      className="flex items-center rounded border border-border bg-surface-alt/60 p-[2px]"
      role="group"
      aria-label="Language / Idioma"
    >
      <Globe
        className="mx-1 hidden size-3.5 text-foreground-muted sm:block"
        aria-hidden="true"
      />
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          className={[
            "h-7 rounded px-sm text-body-sm font-medium uppercase tracking-wide",
            "transition-colors duration-hover ease-hover",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            lang === l
              ? "bg-primary text-primary-foreground"
              : "text-foreground-muted hover:text-foreground",
          ].join(" ")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
