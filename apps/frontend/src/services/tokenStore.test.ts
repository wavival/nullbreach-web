import { beforeEach, describe, expect, it, vi } from "vitest";

async function freshStore() {
  // Reset module cache so the store re-hydrates from cleared sessionStorage.
  vi.resetModules();
  return import("./tokenStore");
}

describe("tokenStore", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("hydrates from sessionStorage on module load", async () => {
    window.sessionStorage.setItem("token", "stored-access");
    window.sessionStorage.setItem("refresh", "stored-refresh");
    const { tokenStore } = await freshStore();
    expect(tokenStore.getAccess()).toBe("stored-access");
    expect(tokenStore.getRefresh()).toBe("stored-refresh");
  });

  it("set() writes both tokens and notifies subscribers", async () => {
    const { tokenStore } = await freshStore();
    const listener = vi.fn();
    const unsub = tokenStore.subscribe(listener);
    tokenStore.set("a", "b");
    expect(tokenStore.getAccess()).toBe("a");
    expect(tokenStore.getRefresh()).toBe("b");
    expect(window.sessionStorage.getItem("token")).toBe("a");
    expect(window.sessionStorage.getItem("refresh")).toBe("b");
    expect(listener).toHaveBeenCalledWith("a");
    unsub();
  });

  it("set() without refresh keeps previous refresh", async () => {
    const { tokenStore } = await freshStore();
    tokenStore.set("a", "b");
    tokenStore.set("a2");
    expect(tokenStore.getAccess()).toBe("a2");
    expect(tokenStore.getRefresh()).toBe("b");
  });

  it("clear() wipes storage and emits null", async () => {
    const { tokenStore } = await freshStore();
    tokenStore.set("a", "b");
    const listener = vi.fn();
    tokenStore.subscribe(listener);
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
    expect(window.sessionStorage.getItem("token")).toBeNull();
    expect(listener).toHaveBeenCalledWith(null);
  });

  it("unsubscribe stops listener", async () => {
    const { tokenStore } = await freshStore();
    const listener = vi.fn();
    const unsub = tokenStore.subscribe(listener);
    unsub();
    tokenStore.set("a", "b");
    expect(listener).not.toHaveBeenCalled();
  });
});
