import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || "/catalog";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: User }>(
        "/auth/login",
        { email, password }
      );
      login({ token: data.token, user: data.user });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || "Falha ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Bem-vindo ao Educarize</h1>
      <p className="muted">Faça login para acessar seus cursos, trilhas e mensagens.</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="********"
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: "12px" }}>
        Ainda não tem conta? <Link to="/register">Criar conta</Link>
      </p>
    </div>
  );
}


