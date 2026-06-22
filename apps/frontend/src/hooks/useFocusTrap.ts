import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Traps Tab/Shift+Tab inside the returned container while `active`. Focuses
 * the first focusable element on mount and restores focus to the previously
 * focused element when the trap deactivates.
 */
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    function getFocusable(): HTMLElement[] {
      return Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
    }

    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0]?.focus();
    } else {
      container.setAttribute("tabindex", "-1");
      container.focus();
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === first || !container!.contains(activeEl)) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (activeEl === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKey);
    return () => {
      container.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
