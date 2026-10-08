import { useState, type FormEvent } from "react";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setSuccess("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao alterar senha"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>Meu Perfil</h2>
        
        <div className="profile-info">
          <div className="info-item">
            <strong>Nome:</strong> {user?.name}
          </div>
          <div className="info-item">
            <strong>Email:</strong> {user?.email}
          </div>
          <div className="info-item">
            <strong>Papel:</strong> {user?.role === "ADMIN" ? "Administrador" : user?.role === "INSTRUCTOR" ? "Instrutor" : "Aluno"}
          </div>
        </div>

        <div className="change-password-section">
          <h3>Alterar Senha</h3>
          <form onSubmit={handleChangePassword} className="form">
            <label>
              Senha Atual
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Digite sua senha atual"
              />
            </label>
            <label>
              Nova Senha
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </label>
            <label>
              Confirmar Nova Senha
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Digite a nova senha novamente"
              />
            </label>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Alterando..." : "Alterar Senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

