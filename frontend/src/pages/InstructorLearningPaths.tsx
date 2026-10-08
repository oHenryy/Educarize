import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { LearningPath } from "../types";
import { useToast } from "../context/useToast";

export default function InstructorLearningPathsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchLearningPaths = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<LearningPath[]>("/learning-paths", {
        params: { instructorId: user?.id },
      });
      setLearningPaths(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar trilhas"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }
    fetchLearningPaths();
  }, [user, fetchLearningPaths, navigate]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja deletar a trilha "${title}"?`)) return;

    try {
      await api.delete(`/learning-paths/${id}`);
      fetchLearningPaths();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao deletar trilha"), "error");
    }
  };

  if (loading) {
    return <div className="loading">Carregando trilhas...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="instructor-learning-paths">
      <header className="page-header">
        <div>
          <h1>Minhas Trilhas de Aprendizado</h1>
          <p className="muted">
            Agrupe cursos em jornadas estruturadas e acompanhe o progresso dos alunos em cada trilha.
          </p>
        </div>
        <Link to="/instructor/learning-paths/new" className="btn-primary">
          + Nova Trilha
        </Link>
      </header>

      {learningPaths.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não criou nenhuma trilha de aprendizado.</p>
          <Link to="/instructor/learning-paths/new" className="btn-primary">
            Criar Primeira Trilha
          </Link>
        </div>
      ) : (
        <div className="learning-paths-list">
          {learningPaths.map((path) => (
            <div key={path.id} className="learning-path-item">
              <div className="path-info">
                {path.coverImageUrl ? (
                  <img src={path.coverImageUrl} alt={path.title} className="path-thumbnail" />
                ) : (
                  <div className="path-thumbnail-placeholder">📚</div>
                )}
                <div className="path-details">
                  <h3>{path.title}</h3>
                  {path.description && <p className="muted">{path.description}</p>}
                  <div className="path-meta">
                    <span className={`status-badge ${path.status.toLowerCase()}`}>
                      {path.status}
                    </span>
                    {path.difficulty && (
                      <span className="difficulty-badge">{path.difficulty}</span>
                    )}
                    {path.estimatedHours && <span>{path.estimatedHours}h</span>}
                    {path.courses && (
                      <span>{path.courses.length} {path.courses.length === 1 ? "curso" : "cursos"}</span>
                    )}
                    {path._count && (
                      <span>{path._count.enrollments} {path._count.enrollments === 1 ? "aluno" : "alunos"}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="path-actions">
                <Link
                  to={`/learning-paths/${path.id}`}
                  className="btn-secondary"
                >
                  Ver
                </Link>
                <Link
                  to={`/instructor/learning-paths/${path.id}/edit`}
                  className="btn-secondary"
                >
                  Editar
                </Link>
                <Link
                  to={`/instructor/learning-paths/${path.id}/courses`}
                  className="btn-secondary"
                >
                  Gerenciar Cursos
                </Link>
                <button
                  onClick={() => handleDelete(path.id, path.title)}
                  className="btn-danger"
                >
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

