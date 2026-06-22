import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { request } from "@/services/api";
import { tokenStore } from "@/services/tokenStore";
import type {
  AuthContextValue,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/auth";
import { AuthContext } from "./auth-context";

const USER_KEY = "user";

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.sessionStorage;
}

function readUser(): User | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeUser(user: User | null): void {
  if (!hasStorage()) return;
  try {
    if (user === null) window.sessionStorage.removeItem(USER_KEY);
    else window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota / privacy errors */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => readUser());
  const [token, setTokenState] = useState<string | null>(tokenStore.getAccess());
  const [isLoading, setIsLoading] = useState(false);

  // Bootstrap: tokenStore module-load already hydrated tokens from sessionStorage.
  // Restore the user paired with the token. If we have a user but no token, the
  // session is inconsistent — clear the user so ProtectedRoute routes correctly.
  useEffect(() => {
    const persistedToken = tokenStore.getAccess();
    if (!persistedToken) {
      if (readUser()) writeUser(null);
      setUserState(null);
    }
  }, []);

  // Subscribe to token changes. When tokens are cleared (logout, refresh fail),
  // also drop the persisted user.
  useEffect(
    () =>
      tokenStore.subscribe((t) => {
        setTokenState(t);
        if (t === null) {
          setUserState(null);
          writeUser(null);
        }
      }),
    [],
  );

  const setToken = useCallback(
    (access: string | null, refresh?: string | null) => {
      if (access === null) {
        tokenStore.clear();
      } else {
        tokenStore.set(access, refresh ?? undefined);
      }
    },
    [],
  );

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    writeUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const data = await request<AuthResponse>({
          url: "/auth/login/",
          method: "POST",
          data: { email, password } satisfies LoginRequest,
          skipAuth: true,
        });
        tokenStore.set(data.access, data.refresh);
        setUser(data.user);
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [setUser],
  );

  // Register creates the account but does NOT authenticate the session.
  // The user must log in afterwards.
  const register = useCallback(
    async (email: string, password: string): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const data = await request<AuthResponse>({
          url: "/auth/register/",
          method: "POST",
          data: { email, password } satisfies RegisterRequest,
          skipAuth: true,
        });
        return data;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, [setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      setToken,
      setUser,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, setToken, setUser, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
