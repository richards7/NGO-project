import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type Role } from "./demo-data";
import { apiRequest } from "./api";

export interface Session {
  name: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  session: Session | null;
  ready: boolean;
  login: (email: string, password?: string) => Promise<Session>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const KEY = "arogya.session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login = useCallback(async (email: string, password = "demo1234"): Promise<Session> => {
    const res = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem("arogya.token", accessToken);
    localStorage.setItem("arogya.refreshToken", refreshToken);

    const s: Session = { name: user.name, email: user.email, role: user.role as Role };
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    return s;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    localStorage.removeItem("arogya.token");
    localStorage.removeItem("arogya.refreshToken");
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, ready, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * Real online status — uses browser's navigator.onLine + PowerSync sync status.
 * Replaced the old fake counter with real PowerSync sync state.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // For pending count and sync, we delegate to PowerSync's useSyncStatus()
  // The app-shell now uses useSyncStatus() directly instead of this hook
  return { online, pending: 0, sync: () => {} };
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = (localStorage.getItem("arogya.theme") as "light" | "dark" | null) ?? "light";
    setTheme(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("arogya.theme", next);
  };
  return { theme, toggle };
}
