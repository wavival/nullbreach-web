import { Globe } from "lucide-react";

type Lang = "es" | "en";

interface Props {
  /** URL of the Spanish page (e.g. /nullbreach/). */
  esUrl: string;
  /** URL of the English page (e.g. /nullbreach/en/). */
  enUrl: string;
  /** Language of the current page. */
  current: Lang;
}

/**
 * Language switcher. Each language is its own crawlable URL, so switching is a
 * navigation (not an in-place CSS swap) — the active page IS the source of
 * truth. Rendered as a tiny React island via `client:load`.
 */
const LABELS: Record<Lang, string> = {
  es: "Cambiar a español",
  en: "Switch to English",
};

export default function LangToggle({ esUrl, enUrl, current }: Props) {
  const items: { lang: Lang; href: string }[] = [
    { lang: "es", href: esUrl },
    { lang: "en", href: enUrl },
  ];

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
      {items.map(({ lang, href }) => {
        const active = lang === current;
        return (
          <a
            key={lang}
            href={href}
            hrefLang={lang}
            aria-current={active ? "true" : undefined}
            aria-label={LABELS[lang]}
            className={[
              "h-7 min-w-[28px] rounded px-md text-body-sm font-medium uppercase tracking-wide",
              "flex items-center justify-center",
              "transition-colors duration-hover ease-hover",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:text-foreground",
            ].join(" ")}
          >
            {lang}
          </a>
        );
      })}
    </div>
  );
}
