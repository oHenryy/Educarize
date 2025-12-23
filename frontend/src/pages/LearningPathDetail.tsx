import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { LearningPath, LearningPathCourse } from "../types";
import { useToast } from "../context/ToastContext";

export default function LearningPathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLearningPath();
      if (user) {
        checkEnrollment();
      }
    }
  }, [id, user]);

  const fetchLearningPath = async () => {
    try {
      setLoading(true);
      const res = await api.get<LearningPath>(`/learning-paths/${id}`);
      setLearningPath(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar trilha");
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const res = await api.get(`/learning-paths/${id}/progress`);
      setProgress(res.data);
      setIsEnrolled(true);
    } catch (err: any) {
      setIsEnrolled(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      setEnrolling(true);
      await api.post(`/learning-paths/${id}/enroll`);
      setIsEnrolled(true);
      await checkEnrollment();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao se matricular na trilha", "error");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="loading">Carregando trilha...</div>;
  }

  if (error || !learningPath) {
    return <div className="error">{error || "Trilha não encontrada"}</div>;
  }

  return (
    <div className="learning-path-detail">
      <div className="path-header">
        {learningPath.coverImageUrl ? (
          <img src={learningPath.coverImageUrl} alt={learningPath.title} className="path-cover-large" />
        ) : (
          <div className="path-cover-large-placeholder">📚</div>
        )}
        <div className="path-header-content">
          <h1>{learningPath.title}</h1>
          {learningPath.description && <p className="path-description">{learningPath.description}</p>}
          <div className="path-header-meta">
            {learningPath.difficulty && (
              <span className="difficulty-badge">{learningPath.difficulty}</span>
            )}
            {learningPath.estimatedHours && (
              <span>⏱️ {learningPath.estimatedHours}h estimadas</span>
            )}
            {learningPath._count && (
              <span>👥 {learningPath._count.enrollments} {learningPath._count.enrollments === 1 ? "aluno" : "alunos"}</span>
            )}
          </div>
          <div className="path-instructor-info">
            <strong>Instrutor:</strong> {learningPath.instructor?.name || "N/D"}
          </div>
          {!isEnrolled && learningPath.status === "PUBLISHED" && (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn-primary"
            >
              {enrolling ? "Matriculando..." : "Matricular-se na Trilha"}
            </button>
          )}
          {isEnrolled && progress && (
            <div className="progress-section">
              <div className="progress-header">
                <h3>Seu Progresso</h3>
                <span className="progress-percentage">{progress.progress}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
              <div className="progress-stats">
                <span>{progress.completedCourses} de {progress.totalCourses} cursos concluídos</span>
                <span>{progress.completedLessons} de {progress.totalLessons} aulas concluídas</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="path-courses-section">
        <h2>Cursos da Trilha</h2>
        {learningPath.courses && learningPath.courses.length > 0 ? (
          <div className="path-courses-list">
            {learningPath.courses.map((pathCourse: LearningPathCourse, index: number) => (
              <div key={pathCourse.id} className="path-course-item">
                <div className="course-order">{index + 1}</div>
                <div className="course-content">
                  <Link to={`/course/${pathCourse.course.id}`}>
                    <h4>{pathCourse.course.title}</h4>
                  </Link>
                  {pathCourse.course.coverImageUrl && (
                    <img
                      src={pathCourse.course.coverImageUrl}
                      alt={pathCourse.course.title}
                      className="course-thumbnail"
                    />
                  )}
                  <div className="course-meta">
                    {pathCourse.course.durationHours && (
                      <span>{pathCourse.course.durationHours}h</span>
                    )}
                    {pathCourse.course.difficulty && (
                      <span>{pathCourse.course.difficulty}</span>
                    )}
                    {pathCourse.isRequired && (
                      <span className="required-badge">Obrigatório</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Nenhum curso adicionado a esta trilha ainda.</p>
        )}
      </div>
    </div>
  );
}

