import { describe, expect, it } from "vitest";
import {
  ApiError,
  apiErrorFromResponse,
  formatApiError,
  parseApiError,
  toApiError,
} from "./errors";

describe("apiErrorFromResponse", () => {
  it("extracts detail from response body", () => {
    const err = apiErrorFromResponse(400, { detail: "Bad input" });
    expect(err.message).toBe("Bad input");
    expect(err.status).toBe(400);
  });

  it("extracts first field array message", () => {
    const err = apiErrorFromResponse(422, { email: ["already in use"] });
    expect(err.message).toBe("already in use");
  });

  it("falls back to status default when no body message", () => {
    expect(apiErrorFromResponse(403, {}).message).toMatch(/permission/i);
  });

  it("falls back to generic 5xx text", () => {
    expect(apiErrorFromResponse(599, {}).message).toMatch(/server/i);
  });
});

describe("parseApiError", () => {
  it("passes through ApiError", () => {
    const err = new ApiError("custom", 418, { foo: "bar" });
    expect(parseApiError(err)).toEqual({
      status: 418,
      message: "custom",
      data: { foo: "bar" },
    });
  });

  it("maps a generic Error to status 0 + its message", () => {
    expect(parseApiError(new Error("boom"))).toEqual({
      status: 0,
      message: "boom",
      data: null,
    });
  });

  it("maps an abort DOMException to status 0", () => {
    const err = new DOMException("aborted", "AbortError");
    expect(parseApiError(err).status).toBe(0);
  });

  it("handles unknown error type", () => {
    expect(parseApiError("oops").message).toMatch(/something went wrong/i);
    expect(parseApiError(undefined).status).toBe(0);
  });
});

describe("formatApiError + toApiError", () => {
  it("formatApiError returns parseApiError().message", () => {
    expect(formatApiError(new ApiError("Not found", 404, null))).toBe("Not found");
  });

  it("toApiError wraps non-ApiError into ApiError", () => {
    const api = toApiError(new Error("Not found"));
    expect(api).toBeInstanceOf(ApiError);
    expect(api.status).toBe(0);
    expect(api.message).toBe("Not found");
  });

  it("toApiError passes ApiError through unchanged", () => {
    const original = new ApiError("custom", 418, {});
    expect(toApiError(original)).toBe(original);
  });
});
