import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { User } from "../types";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error");
  const [error, setError] = useState<string | null>(token ? null : "O link de confirmação está incompleto.");
  // Em StrictMode o efeito roda duas vezes; o token é de uso único, então só é enviado uma vez.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;

    async function verify() {
      try {
        await api.post("/auth/verify-email", { token });
        setStatus("success");
        // Atualiza o usuário logado (se houver) para remover o aviso de e-mail pendente.
        const me = await api.get<{ user: User }>("/auth/me").catch(() => null);
        if (me) updateUser(me.data.user);
      } catch (err) {
        setStatus("error");
        setError(getErrorMessage(err, "Não foi possível confirmar o e-mail"));
      }
    }

    verify();
  }, [token, updateUser]);

  return (
    <div className="auth-card">
      <h1>Confirmação de e-mail</h1>
      {status === "verifying" && <p className="muted">Confirmando seu e-mail...</p>}
      {status === "success" && <div className="success-message">E-mail confirmado com sucesso!</div>}
      {status === "error" && <div className="error">{error}</div>}
      <p style={{ marginTop: "12px" }}>
        {user ? <Link to="/catalog">Ir para o catálogo</Link> : <Link to="/login">Ir para o login</Link>}
      </p>
    </div>
  );
}
