import { useEffect, useState } from "react";
import { api, getErrorMessage, getErrorStatus } from "../api/client";
import type { QueryParams } from "../types";

interface ActivityLog {
  id: string;
  action: string;
  description: string | null;
  resourceId: string | null;
  resourceType: string | null;
  userId: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface ActivityLogsResponse {
  logs: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const ACTION_LABELS: Record<string, string> = {
  COURSE_CREATED: "Curso Criado",
  COURSE_UPDATED: "Curso Atualizado",
  COURSE_DELETED: "Curso Deletado",
  LESSON_CREATED: "Aula Criada",
  LESSON_UPDATED: "Aula Atualizada",
  LESSON_DELETED: "Aula Deletada",
  MODULE_CREATED: "Módulo Criado",
  MODULE_UPDATED: "Módulo Atualizado",
  MODULE_DELETED: "Módulo Deletado",
  USER_CREATED: "Usuário Criado",
  USER_UPDATED: "Usuário Atualizado",
  USER_DELETED: "Usuário Deletado",
  ENROLLMENT_CREATED: "Matrícula Criada",
  ENROLLMENT_DELETED: "Matrícula Cancelada",
  QUIZ_CREATED: "Quiz Criado",
  QUIZ_UPDATED: "Quiz Atualizado",
  QUIZ_DELETED: "Quiz Deletado",
  CERTIFICATE_GENERATED: "Certificado Gerado",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  COURSE: "Curso",
  LESSON: "Aula",
  MODULE: "Módulo",
  USER: "Usuário",
  ENROLLMENT: "Matrícula",
  QUIZ: "Quiz",
  CERTIFICATE: "Certificado",
};

export default function AdminActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    userId: "",
  });

  useEffect(() => {
    async function fetchLogs() {
      try {
        const params: QueryParams = { page, limit: 50 };
        if (filters.action) params.action = filters.action;
        if (filters.resourceType) params.resourceType = filters.resourceType;
        if (filters.userId) params.userId = filters.userId;

        const res = await api.get<ActivityLogsResponse>("/activity-logs", { params });
        setLogs(res.data);
      } catch (err) {
        if (getErrorStatus(err) === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (getErrorStatus(err) === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(getErrorMessage(err, "Erro ao carregar logs"));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [page, filters]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <div className="loading">Carregando logs...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!logs) {
    return (
      <div className="admin-page">
        <div className="empty-state">
          <h3>Nenhum log encontrado</h3>
          <p className="muted">
            Assim que ações forem realizadas no sistema, elas aparecerão aqui para auditoria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="page-header">
        <div>
          <h1>Logs de Atividades</h1>
          <p className="muted">
            Acompanhe todas as ações relevantes realizadas na plataforma para fins de auditoria e segurança.
          </p>
        </div>
      </header>

      <div className="filters-section" style={{ marginBottom: "20px" }}>
        <div className="filter-group">
          <label>
            Ação:
            <select
              value={filters.action}
              onChange={(e) => {
                setFilters({ ...filters, action: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de Recurso:
            <select
              value={filters.resourceType}
              onChange={(e) => {
                setFilters({ ...filters, resourceType: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            ID do Usuário:
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => {
                setFilters({ ...filters, userId: e.target.value });
                setPage(1);
              }}
              placeholder="Filtrar por ID do usuário"
            />
          </label>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Ação</th>
              <th>Descrição</th>
              <th>Usuário</th>
              <th>Tipo de Recurso</th>
              <th>ID do Recurso</th>
            </tr>
          </thead>
          <tbody>
            {logs.logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center" }}>
                  Nenhum log encontrado
                </td>
              </tr>
            ) : (
              logs.logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <span className="badge">{ACTION_LABELS[log.action] || log.action}</span>
                  </td>
                  <td>{log.description || "-"}</td>
                  <td>
                    {log.user ? (
                      <>
                        {log.user.name} ({log.user.email})
                      </>
                    ) : (
                      "Sistema"
                    )}
                  </td>
                  <td>
                    {log.resourceType ? (
                      <span className="badge-secondary">
                        {RESOURCE_TYPE_LABELS[log.resourceType] || log.resourceType}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {log.resourceId ? (
                      <code style={{ fontSize: "0.85em" }}>{log.resourceId.substring(0, 8)}...</code>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {logs.pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Anterior
          </button>
          <span>
            Página {logs.pagination.page} de {logs.pagination.totalPages} ({logs.pagination.total} total)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(logs.pagination.totalPages, p + 1))}
            disabled={page === logs.pagination.totalPages}
            className="btn-secondary"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

