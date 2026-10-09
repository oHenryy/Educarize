import { useCallback, useEffect, useState } from "react";
import { api, SESSION_EXPIRED_EVENT } from "../api/client";
import type { User } from "../types";
import { AuthContext } from "./auth-context";

/**
 * Apenas os dados públicos do usuário ficam no localStorage, para a interface abrir sem "piscar".
 * O token de sessão fica em cookie httpOnly, fora do alcance do JavaScript.
 */
const STORAGE_KEY = "educarize_user";

function readCachedUser(): User | null {
  // Remove chaves da versão anterior, que guardava o token no localStorage.
  localStorage.removeItem("token");
  localStorage.removeItem("educarize_auth");
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readCachedUser);
  const [loading, setLoading] = useState(true);

  const updateUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Confirma a sessão com o servidor ao abrir o app (o papel pode ter mudado; o cookie pode ter expirado).
  useEffect(() => {
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => updateUser(res.data.user))
      .catch(() => updateUser(null))
      .finally(() => setLoading(false));
  }, [updateUser]);

  // Sessão expirada e não renovável (ex.: usuário excluído ou refresh revogado).
  useEffect(() => {
    const onExpired = () => updateUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [updateUser]);

  const login = (nextUser: User) => updateUser(nextUser);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      updateUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
