const AUTHOR_NAME = import.meta.env.VITE_AUTHOR_NAME ?? "Valentina Ramírez";
const AUTHOR_URL = import.meta.env.VITE_AUTHOR_URL ?? "https://wavival.dev";
const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer
      className={[
        "flex justify-center items-center text-center",
        "border-t border-border bg-surface",
        "px-md py-md",
        "text-body-sm text-foreground-muted",
      ].join(" ")}
    >
      <span>
        © {YEAR} {AUTHOR_NAME} ·{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary hover:text-secondary-hover hover:underline underline-offset-2 transition-colors duration-hover ease-hover"
        >
          {new URL(AUTHOR_URL).hostname.replace(/^www\./, "")}
        </a>
      </span>
    </footer>
  );
}
