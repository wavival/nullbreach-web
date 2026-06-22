import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./server";
import { tokenStore } from "@/services/tokenStore";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  // tokenStore keeps a module-level cache that survives sessionStorage.clear().
  tokenStore.clear();
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterAll(() => server.close());

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
