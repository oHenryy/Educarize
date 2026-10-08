import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { User } from "../types";
import { AuthContext } from "./auth-context";

const STORAGE_KEY = "educarize_auth";

type StoredAuth = { user: User; token: string };

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    localStorage.setItem("token", parsed.token);
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Lido de forma síncrona na inicialização: evita um render extra "deslogado".
  const [stored] = useState(readStoredAuth);
  const [user, setUser] = useState<User | null>(stored?.user ?? null);
  const [token, setToken] = useState<string | null>(stored?.token ?? null);

  const persist = (data: StoredAuth) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem("token", data.token);
  };

  const login = (data: StoredAuth) => {
    setUser(data.user);
    setToken(data.token);
    persist(data);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("token");
  };

  const updateUser = useCallback(
    (nextUser: User) => {
      setUser(nextUser);
      if (token) persist({ user: nextUser, token });
    },
    [token]
  );

  // O papel pode ter sido alterado por um admin: sincroniza com o servidor ao abrir o app e após o login.
  useEffect(() => {
    if (!token) return;
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => updateUser(res.data.user))
      .catch(() => {
        // 401 já é tratado pelo interceptor (logout + redirecionamento).
      });
  }, [token, updateUser]);

  return (
    <AuthContext.Provider value={{ user, token, loading: false, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
