import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStore } from "./tokenStore";
import { toast } from "@/lib/toast";
import { toApiError } from "@/lib/errors";
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

const BASE_URL = resolveBaseUrl();

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuth?: boolean;
  _silent?: boolean;
}

api.interceptors.request.use((config) => {
  const cfg = config as RetriableConfig;
  if (cfg._skipAuth) return cfg;
  const token = tokenStore.getAccess();
  if (token) {
    cfg.headers.set("Authorization", `Bearer ${token}`);
  }
  return cfg;
});

let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;
  try {
    const res = await axios.post<RefreshResponse>(
      `${BASE_URL}/auth/refresh/`,
      { refresh },
      { headers: { "Content-Type": "application/json" } },
    );
    tokenStore.set(res.data.access, res.data.refresh ?? refresh);
    return res.data.access;
  } catch {
    tokenStore.clear();
    return null;
  }
}

function shouldToast(cfg: RetriableConfig | undefined): boolean {
  if (!cfg) return true;
  return !cfg._skipAuth && !cfg._silent;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    // Network / timeout / no-response cases.
    if (!error.response) {
      const apiError = toApiError(error);
      if (shouldToast(original)) toast.error(apiError.message);
      return Promise.reject(apiError);
    }

    const status = error.response.status;

    // 401: try refresh once, retry original.
    if (status === 401 && original && !original._retry && !original._skipAuth) {
      original._retry = true;
      refreshPromise ??= performRefresh().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return api.request(original);
      }
      // Refresh failed → tokens already cleared; surface friendly toast.
      const apiError = toApiError(error);
      if (!original._silent) {
        toast.error("Session expired, please sign in.");
      }
      return Promise.reject(apiError);
    }

    const apiError = toApiError(error);
    if (shouldToast(original)) {
      toast.error(apiError.message);
    }
    return Promise.reject(apiError);
  },
);

export type ApiRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  /** Suppress automatic toast on error. Use when the caller renders its own
   *  inline error / custom toast and doesn't want a duplicate. */
  silent?: boolean;
};

export async function request<T>(config: ApiRequestConfig): Promise<T> {
  const { skipAuth, silent, ...rest } = config;
  const res = await api.request<T>({
    ...rest,
    ...(skipAuth ? { _skipAuth: true } : {}),
    ...(silent ? { _silent: true } : {}),
  } as AxiosRequestConfig);
  return res.data;
}
