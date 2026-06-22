import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, formatApiError, parseApiError, toApiError } from "./errors";

function axiosResponseError(status: number, data: unknown): AxiosError {
  const err = new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    { headers: new AxiosHeaders() },
    {},
    {
      status,
      statusText: "",
      data,
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
  return err;
}

describe("parseApiError", () => {
  it("passes through ApiError", () => {
    const err = new ApiError("custom", 418, { foo: "bar" });
    expect(parseApiError(err)).toEqual({
      status: 418,
      message: "custom",
      data: { foo: "bar" },
    });
  });

  it("maps ECONNABORTED to timeout message", () => {
    const err = new AxiosError("timeout", "ECONNABORTED");
    expect(parseApiError(err).status).toBe(0);
    expect(parseApiError(err).message).toMatch(/timed out/i);
  });

  it("maps ERR_NETWORK to offline message", () => {
    const err = new AxiosError("net", "ERR_NETWORK");
    expect(parseApiError(err).status).toBe(0);
    expect(parseApiError(err).message).toMatch(/no connection/i);
  });

  it("extracts detail from response body", () => {
    const err = axiosResponseError(400, { detail: "Bad input" });
    expect(parseApiError(err).message).toBe("Bad input");
    expect(parseApiError(err).status).toBe(400);
  });

  it("extracts first field array message", () => {
    const err = axiosResponseError(422, { email: ["already in use"] });
    expect(parseApiError(err).message).toBe("already in use");
  });

  it("falls back to status default when no body message", () => {
    const err = axiosResponseError(403, {});
    expect(parseApiError(err).message).toMatch(/permission/i);
  });

  it("falls back to generic 5xx text", () => {
    const err = axiosResponseError(599, {});
    expect(parseApiError(err).message).toMatch(/server/i);
  });

  it("handles unknown error type", () => {
    expect(parseApiError("oops").message).toMatch(/something went wrong/i);
    expect(parseApiError(undefined).status).toBe(0);
  });
});

describe("formatApiError + toApiError", () => {
  it("formatApiError returns parseApiError().message", () => {
    const err = axiosResponseError(404, { detail: "Not found" });
    expect(formatApiError(err)).toBe("Not found");
  });

  it("toApiError wraps non-ApiError into ApiError", () => {
    const err = axiosResponseError(404, { detail: "Not found" });
    const api = toApiError(err);
    expect(api).toBeInstanceOf(ApiError);
    expect(api.status).toBe(404);
    expect(api.message).toBe("Not found");
  });

  it("toApiError passes ApiError through unchanged", () => {
    const original = new ApiError("custom", 418, {});
    expect(toApiError(original)).toBe(original);
  });
});
