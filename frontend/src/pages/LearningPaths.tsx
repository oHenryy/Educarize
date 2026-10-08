import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { LearningPath } from "../types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";

export default function LearningPathsPage() {
  const { user } = useAuth();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "my">("all");

  const fetchLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = filter === "my" ? "/learning-paths/my" : "/learning-paths";
      const res = await api.get<LearningPath[]>(endpoint);
      setLearningPaths(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar trilhas"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLearningPaths();
  }, [filter, fetchLearningPaths]);

  if (loading) {
    return <div className="loading">Carregando trilhas...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="learning-paths-page">
      <PageHeader
        title="Trilhas de Aprendizado"
        subtitle="Siga jornadas estruturadas de cursos ou veja as trilhas criadas por você."
        actions={
          user ? (
            <div className="filter-tabs">
              <button
                className={filter === "all" ? "active" : ""}
                onClick={() => setFilter("all")}
              >
                Todas as Trilhas
              </button>
              <button
                className={filter === "my" ? "active" : ""}
                onClick={() => setFilter("my")}
              >
                Minhas Trilhas
              </button>
            </div>
          ) : null
        }
      />

      {learningPaths.length === 0 ? (
        <EmptyState title="Nenhuma trilha de aprendizado disponível" />
      ) : (
        <div className="learning-paths-grid">
          {learningPaths.map((path) => (
            <div key={path.id} className="learning-path-card">
              <Link to={`/learning-paths/${path.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {path.coverImageUrl ? (
                  <img src={path.coverImageUrl} alt={path.title} className="path-cover" />
                ) : (
                  <div className="path-cover-placeholder">📚</div>
                )}
                <div className="path-body">
                  <h3>{path.title}</h3>
                  {path.description && <p className="muted">{path.description}</p>}
                  <div className="path-meta">
                    {path.difficulty && (
                      <span className="difficulty-badge">{path.difficulty}</span>
                    )}
                    {path.estimatedHours && (
                      <span>{path.estimatedHours}h estimadas</span>
                    )}
                    {path._count && (
                      <span>{path._count.enrollments} {path._count.enrollments === 1 ? "aluno" : "alunos"}</span>
                    )}
                  </div>
                  <div className="path-instructor">
                    <small className="muted">
                      Por: {path.instructor?.name || "N/D"}
                    </small>
                  </div>
                  {path.courses && path.courses.length > 0 && (
                    <div className="path-courses-count">
                      <small>{path.courses.length} {path.courses.length === 1 ? "curso" : "cursos"}</small>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

