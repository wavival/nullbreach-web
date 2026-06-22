import { useEffect } from "react";

const BASE = "NullBreach";

/**
 * Sets document.title to `${title} · NullBreach` for the lifetime of the
 * component. Restores the previous title on unmount.
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${BASE}` : BASE;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
