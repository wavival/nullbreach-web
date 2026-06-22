// Token store backed by sessionStorage so the session survives page reloads
// (but is dropped when the browser tab/window is closed).
//
// Reads at module load to hydrate from any prior reload; writes on every
// set()/clear(). Axios interceptors keep reading from this store, so they
// transparently benefit from the persistence.
//
// SECURITY: sessionStorage is readable by any JS running on the origin, so
// JWTs here are vulnerable to XSS exfiltration. The mitigation is a strict
// CSP plus careful third-party script hygiene. For higher-assurance setups,
// move to httpOnly + SameSite=Lax cookies issued by the API and rely on
// `withCredentials` instead of bearer tokens.

const ACCESS_KEY = "token";
const REFRESH_KEY = "refresh";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function readKey(key: string): string | null {
  if (!hasStorage()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string | null): void {
  if (!hasStorage()) return;
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore storage errors (quota / privacy mode) */
  }
}

let accessToken: string | null = readKey(ACCESS_KEY);
let refreshToken: string | null = readKey(REFRESH_KEY);

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export const tokenStore = {
  getAccess(): string | null {
    return accessToken;
  },
  getRefresh(): string | null {
    return refreshToken;
  },
  set(access: string | null, refresh?: string | null): void {
    accessToken = access;
    writeKey(ACCESS_KEY, access);
    if (refresh !== undefined) {
      refreshToken = refresh;
      writeKey(REFRESH_KEY, refresh);
    }
    listeners.forEach((l) => l(accessToken));
  },
  clear(): void {
    accessToken = null;
    refreshToken = null;
    writeKey(ACCESS_KEY, null);
    writeKey(REFRESH_KEY, null);
    listeners.forEach((l) => l(null));
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
