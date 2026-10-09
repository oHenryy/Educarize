import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { User, Role } from "../types";

const roles: Role[] = ["STUDENT", "INSTRUCTOR"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ user: User }>("/auth/register", { name, email, password, role });
      login(data.user);
      navigate("/catalog", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Falha ao registrar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Criar conta</h1>
      <p className="muted">
        Cadastre-se como aluno ou instrutor para começar a usar a plataforma.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Seu nome"
          />
        </div>

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

        <div className="form-group">
          <label htmlFor="role">Papel</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r === "STUDENT" ? "Aluno" : "Instrutor"}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: "12px" }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}


