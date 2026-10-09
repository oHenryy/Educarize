import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível enviar o link agora. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Esqueci minha senha</h1>
      <p className="muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

      {message ? (
        <div className="success-message">{message}</div>
      ) : (
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

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}

      <p className="muted" style={{ marginTop: "12px" }}>
        <Link to="/login">Voltar para o login</Link>
      </p>
    </div>
  );
}
