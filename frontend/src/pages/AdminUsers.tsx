import { useEffect, useState } from "react";
import { api } from "../api/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  _count: {
    coursesCreated: number;
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState("");
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const params: any = { page, limit: 20 };
        if (search) params.search = search;

        const res = await api.get<UsersResponse>("/admin/users", { params });
        setUsers(res.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (err.response?.status === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(err.response?.data?.error || "Erro ao carregar usuários");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [page, search]);

  const handleUpdateRole = async (userId: string) => {
    if (!newRole) return;

    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      alert("Papel atualizado com sucesso!");
      setEditingUser(null);
      setNewRole("");
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get<UsersResponse>("/admin/users", { params });
      setUsers(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao atualizar papel");
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (!confirm("Tem certeza que deseja resetar a senha deste usuário?")) {
      return;
    }

    try {
      await api.put(`/admin/users/${userId}/reset-password`, {
        newPassword,
      });
      alert("Senha resetada com sucesso!");
      setResettingPassword(null);
      setNewPassword("");
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao resetar senha");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      alert("Usuário deletado com sucesso!");
      // Recarregar usuários
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      const res = await api.get<UsersResponse>("/admin/users", { params });
      setUsers(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao deletar usuário");
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
      <h1>Gestão de Usuários</h1>

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
        <div className="users-info">
          Total: {users.pagination.total} usuários
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
              <th>Matrículas</th>
              <th>Cadastrado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="avatar-small" />
                    ) : (
                      <div className="avatar-small">{user.name.substring(0, 1).toUpperCase()}</div>
                    )}
                    <strong>{user.name}</strong>
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
                    ) : (
                      <>
                        <button
                          className="btn-secondary-small"
                          onClick={() => {
                            setEditingUser(user.id);
                            setNewRole(user.role);
                          }}
                        >
                          Editar Papel
                        </button>
                        {user.role !== "ADMIN" && (
                          <>
                            <button
                              className="btn-secondary-small"
                              onClick={() => {
                                setResettingPassword(user.id);
                                setNewPassword("");
                              }}
                            >
                              Resetar Senha
                            </button>
                            <button
                              className="btn-danger-small"
                              onClick={() => handleDeleteUser(user.id, user.name)}
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
            ))}
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

