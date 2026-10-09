import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { updateUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("As senhas não conferem");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      // Todas as sessões foram encerradas no servidor; garante que esta também saia.
      updateUser(null);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível redefinir a senha"));
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-card">
        <h1>Link inválido</h1>
        <p className="muted">O link de redefinição está incompleto.</p>
        <Link to="/forgot-password">Solicitar um novo link</Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Criar nova senha</h1>

      {done ? (
        <>
          <div className="success-message">Senha redefinida com sucesso.</div>
          <p style={{ marginTop: "12px" }}>
            <Link to="/login">Entrar com a nova senha</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="password">Nova senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo de 6 caracteres"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmation">Confirme a nova senha</label>
            <input
              id="confirmation"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="error">
              {error} {error.includes("expirado") && <Link to="/forgot-password">Solicitar novo link</Link>}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Redefinir senha"}
          </button>
        </form>
      )}
    </div>
  );
}
