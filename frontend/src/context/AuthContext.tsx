import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "../types";

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: { user: User; token: string }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "educarize_auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { user: User; token: string };
        setUser(parsed.user);
        setToken(parsed.token);
        localStorage.setItem("token", parsed.token);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const login = (data: { user: User; token: string }) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem("token", data.token);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


