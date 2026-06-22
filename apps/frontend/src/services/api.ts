import { tokenStore } from "./tokenStore";
import { toast } from "@/lib/toast";
import { ApiError, apiErrorFromResponse } from "@/lib/errors";
import type { RefreshResponse } from "@/types/auth";

function resolveBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  // Production builds must specify VITE_API_URL — silently pointing at
  // localhost would break shipped apps. Dev gets a sensible default.
  if (import.meta.env.PROD) {
    throw new Error("VITE_API_URL is required in production builds.");
  }
  return "http://localhost:8000";
}

const BASE_URL = resolveBaseUrl().replace(/\/+$/, "");
const TIMEOUT_MS = 20_000;

export interface ApiRequestConfig {
  url: string;
  method?: string;
  /** JSON request body. Serialized with JSON.stringify; sets Content-Type. */
  data?: unknown;
  /** Caller-owned abort signal (e.g. cancel an in-flight chat send). */
  signal?: AbortSignal;
  /** Skip Authorization header + the 401 refresh-retry (auth endpoints). */
  skipAuth?: boolean;
  /** Suppress the automatic error toast. Use when the caller renders its own
   *  inline error and doesn't want a duplicate. */
  silent?: boolean;
}

interface InternalConfig extends ApiRequestConfig {
  _retry?: boolean;
}

/** Read a Response body as JSON when possible, else text, else null. */
async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Single fetch with a timeout, combined with any caller-supplied abort signal.
 * Throws ApiError on non-2xx, network failure, or timeout. A caller-initiated
 * abort propagates as the original AbortError (so callers can detect cancels).
 */
async function doFetch<T>(
  cfg: ApiRequestConfig,
  authToken: string | undefined,
): Promise<T> {
  const { url, method = "GET", data, signal } = cfg;

  const headers: Record<string, string> = {};
  if (data !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    TIMEOUT_MS,
  );

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    const reason = controller.signal.reason;
    if (reason instanceof DOMException && reason.name === "TimeoutError") {
      throw new ApiError("Request timed out. Try again.", 0, null);
    }
    // Caller cancelled: propagate the original abort so callers can detect it.
    if (signal?.aborted) throw err;
    throw new ApiError("No connection. Check your internet.", 0, null);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }

  const body = await parseBody(res);
  if (!res.ok) throw apiErrorFromResponse(res.status, body);
  return body as T;
}

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const data = await doFetch<RefreshResponse>(
      { url: "/auth/refresh/", method: "POST", data: { refresh }, skipAuth: true },
      undefined,
    );
    tokenStore.set(data.access, data.refresh ?? refresh);
    return data.access;
  } catch {
    tokenStore.clear();
    return null;
  }
}

async function doRequest<T>(cfg: InternalConfig): Promise<T> {
  const token = cfg.skipAuth ? undefined : (tokenStore.getAccess() ?? undefined);
  try {
    return await doFetch<T>(cfg, token);
  } catch (err) {
    // 401 → refresh once (deduped across concurrent calls), then retry.
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      !cfg._retry &&
      !cfg.skipAuth
    ) {
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) return doRequest<T>({ ...cfg, _retry: true });
      // Refresh failed → tokens already cleared; surface friendly toast.
      const apiError = new ApiError("Session expired, please sign in.", 401, err.data);
      if (!cfg.silent) toast.error(apiError.message);
      throw apiError;
    }
    if (err instanceof ApiError) {
      if (!cfg.skipAuth && !cfg.silent) toast.error(err.message);
      throw err;
    }
    // Aborts / unexpected throwables: propagate without a toast.
    throw err;
  }
}

export function request<T>(config: ApiRequestConfig): Promise<T> {
  return doRequest<T>(config);
}
