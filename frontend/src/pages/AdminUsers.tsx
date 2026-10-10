import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage, getErrorStatus } from "../api/client";
import type { QueryParams } from "../types";
import { useToast } from "../context/useToast";
import { useAuth } from "../context/useAuth";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  _count: {
    coursesCreated: number;
    learningPathsCreated: number;
    enrollments: number;
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type TransferCandidate = { id: string; name: string; role: string };

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [transferringUser, setTransferringUser] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [transferCandidates, setTransferCandidates] = useState<TransferCandidate[]>([]);
  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    const params: QueryParams = { page, limit: 20 };
    if (search) params.search = search;
    const res = await api.get<UsersResponse>("/admin/users", { params });
    setUsers(res.data);
  }, [page, search]);

  useEffect(() => {
    async function loadUsers() {
      try {
        await fetchUsers();
      } catch (err) {
        if (getErrorStatus(err) === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (getErrorStatus(err) === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(getErrorMessage(err, "Erro ao carregar usuários"));
        }
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [fetchUsers]);

  const reloadUsers = async () => {
    try {
      await fetchUsers();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao recarregar usuários"), "error");
    }
  };

  const handleUpdateRole = async (userId: string) => {
    if (!newRole) return;

    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      showToast("Papel atualizado com sucesso!", "success");
      setEditingUser(null);
      setNewRole("");
      await reloadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar papel"), "error");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      showToast("A senha deve ter pelo menos 6 caracteres", "error");
      return;
    }

    if (!confirm("Tem certeza que deseja resetar a senha deste usuário?")) {
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/reset-password`, {
        newPassword,
      });
      showToast("Senha resetada com sucesso!", "success");
      setResettingPassword(null);
      setNewPassword("");
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao resetar senha"), "error");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      showToast("Usuário deletado com sucesso!", "success");
      await reloadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao deletar usuário"), "error");
    }
  };

  const startTransfer = async (userId: string) => {
    try {
      // Admin recebe a lista completa de usuários; só instrutores/admins podem receber conteúdo.
      const res = await api.get<TransferCandidate[]>("/auth/users", {
        params: { roles: "INSTRUCTOR,ADMIN", limit: 100 },
      });
      setTransferCandidates(res.data.filter((u) => u.id !== userId));
      setTransferTarget("");
      setTransferringUser(userId);
      setEditingUser(null);
      setResettingPassword(null);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao carregar instrutores"), "error");
    }
  };

  const handleTransfer = async (user: User) => {
    if (!transferTarget) {
      showToast("Selecione quem receberá o conteúdo", "error");
      return;
    }
    const target = transferCandidates.find((c) => c.id === transferTarget);
    if (
      !confirm(
        `Transferir ${user._count.coursesCreated} curso(s) e ${user._count.learningPathsCreated} trilha(s) de "${user.name}" para "${target?.name}"?`
      )
    ) {
      return;
    }

    try {
      const res = await api.post<{ coursesTransferred: number; learningPathsTransferred: number }>(
        `/admin/users/${user.id}/transfer-content`,
        { targetUserId: transferTarget }
      );
      showToast(
        `${res.data.coursesTransferred} curso(s) e ${res.data.learningPathsTransferred} trilha(s) transferidos.`,
        "success"
      );
      setTransferringUser(null);
      setTransferTarget("");
      await reloadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao transferir conteúdo"), "error");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) return <div className="loading">Carregando usuários...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!users) return null;

  return (
    <div className="admin-users">
      <header className="page-header">
        <div>
          <h1>Gestão de Usuários</h1>
          <p className="muted">
            Visualize, filtre e gerencie os usuários da plataforma, incluindo papéis, redefinição de senha e
            transferência de cursos e trilhas entre instrutores.
          </p>
        </div>
        <div className="users-info">
          Total: {users.pagination.total} usuários
        </div>
      </header>

      <div className="users-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Cursos Criados</th>
              <th>Trilhas Criadas</th>
              <th>Matrículas</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.users.map((user) => {
              const isSelf = user.id === currentUser?.id;
              const ownsContent = user._count.coursesCreated + user._count.learningPathsCreated > 0;

              return (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="avatar-small" />
                      ) : (
                        <div className="avatar-small">{user.name.substring(0, 1).toUpperCase()}</div>
                      )}
                      <strong>{user.name}</strong>
                      {isSelf && <small className="muted"> (você)</small>}
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {editingUser === user.id ? (
                      <select
                        value={newRole || user.role}
                        onChange={(e) => setNewRole(e.target.value)}
                      >
                        <option value="STUDENT">STUDENT</option>
                        <option value="INSTRUCTOR">INSTRUCTOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    ) : (
                      <span className={`badge role-${user.role.toLowerCase()}`}>{user.role}</span>
                    )}
                  </td>
                  <td>{user._count.coursesCreated}</td>
                  <td>{user._count.learningPathsCreated}</td>
                  <td>{user._count.enrollments}</td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="action-buttons">
                      {editingUser === user.id ? (
                        <>
                          <button
                            className="btn-primary-small"
                            onClick={() => handleUpdateRole(user.id)}
                          >
                            Salvar
                          </button>
                          <button
                            className="btn-secondary-small"
                            onClick={() => {
                              setEditingUser(null);
                              setNewRole("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : resettingPassword === user.id ? (
                        <>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha (mín. 6 caracteres)"
                            style={{ marginRight: "8px", padding: "4px 8px", width: "200px" }}
                            minLength={6}
                          />
                          <button
                            className="btn-primary-small"
                            onClick={() => handleResetPassword(user.id)}
                          >
                            Confirmar
                          </button>
                          <button
                            className="btn-secondary-small"
                            onClick={() => {
                              setResettingPassword(null);
                              setNewPassword("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : transferringUser === user.id ? (
                        <>
                          <select
                            value={transferTarget}
                            onChange={(e) => setTransferTarget(e.target.value)}
                            style={{ marginRight: "8px" }}
                          >
                            <option value="">Transferir para...</option>
                            {transferCandidates.map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>
                                {candidate.name} ({candidate.role})
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn-primary-small"
                            onClick={() => handleTransfer(user)}
                            disabled={!transferTarget}
                          >
                            Transferir
                          </button>
                          <button
                            className="btn-secondary-small"
                            onClick={() => {
                              setTransferringUser(null);
                              setTransferTarget("");
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          {!isSelf && (
                            <button
                              className="btn-secondary-small"
                              onClick={() => {
                                setEditingUser(user.id);
                                setNewRole(user.role);
                                setTransferringUser(null);
                              }}
                            >
                              Editar Papel
                            </button>
                          )}
                          {ownsContent && (
                            <button
                              className="btn-secondary-small"
                              onClick={() => startTransfer(user.id)}
                              title="Transferir cursos e trilhas para outro instrutor"
                            >
                              Transferir Conteúdo
                            </button>
                          )}
                          {user.role !== "ADMIN" && (
                            <>
                              <button
                                className="btn-secondary-small"
                                onClick={() => {
                                  setResettingPassword(user.id);
                                  setNewPassword("");
                                  setTransferringUser(null);
                                }}
                              >
                                Resetar Senha
                              </button>
                              <button
                                className="btn-danger-small"
                                onClick={() => handleDeleteUser(user.id, user.name)}
                                disabled={ownsContent}
                                title={
                                  ownsContent
                                    ? "Transfira os cursos e trilhas deste usuário antes de excluí-lo"
                                    : undefined
                                }
                              >
                                Deletar
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {users.pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary"
          >
            Anterior
          </button>
          <span>
            Página {page} de {users.pagination.totalPages}
          </span>
          <button
            disabled={page === users.pagination.totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
