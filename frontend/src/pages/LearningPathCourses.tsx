import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { LearningPath, LearningPathCourse, Course } from "../types";
import { useToast } from "../context/ToastContext";

export default function LearningPathCoursesPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseOrder, setCourseOrder] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }
    if (id) {
      fetchLearningPath();
      fetchAvailableCourses();
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

  const fetchAvailableCourses = async () => {
    try {
      const res = await api.get<Course[]>("/courses", {
        params: { status: "PUBLISHED", instructorId: user?.id },
      });
      setAvailableCourses(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar cursos:", err);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      showToast("Selecione um curso", "error");
      return;
    }

    try {
      await api.post(`/learning-paths/${id}/courses`, {
        courseId: selectedCourseId,
        order: courseOrder ? parseInt(courseOrder) : undefined,
        isRequired,
      });
      setShowAddForm(false);
      setSelectedCourseId("");
      setCourseOrder("");
      setIsRequired(true);
      fetchLearningPath();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao adicionar curso", "error");
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm("Tem certeza que deseja remover este curso da trilha?")) return;

    try {
      await api.delete(`/learning-paths/${id}/courses`, {
        data: { courseId },
        headers: {
          'Content-Type': 'application/json',
        },
      });
      fetchLearningPath();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao remover curso", "error");
    }
  };

  const handleReorder = async (pathCourseId: string, direction: "up" | "down") => {
    try {
      const pathCourse = learningPath?.courses?.find((pc) => pc.id === pathCourseId);
      if (!pathCourse || !learningPath?.courses) return;

      const currentIndex = learningPath.courses.findIndex((pc) => pc.id === pathCourseId);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= learningPath.courses.length) return;

      const targetCourse = learningPath.courses[newIndex];
      
      await api.delete(`/learning-paths/${id}/courses`, {
        data: { courseId: pathCourse.courseId },
        headers: { 'Content-Type': 'application/json' },
      });

      await api.post(`/learning-paths/${id}/courses`, {
        courseId: pathCourse.courseId,
        order: targetCourse.order,
        isRequired: pathCourse.isRequired,
      });

      await api.delete(`/learning-paths/${id}/courses`, {
        data: { courseId: targetCourse.courseId },
        headers: { 'Content-Type': 'application/json' },
      });

      await api.post(`/learning-paths/${id}/courses`, {
        courseId: targetCourse.courseId,
        order: pathCourse.order,
        isRequired: targetCourse.isRequired,
      });

      fetchLearningPath();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao reordenar curso", "error");
    }
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  if (error || !learningPath) {
    return <div className="error">{error || "Trilha não encontrada"}</div>;
  }

  const enrolledCourseIds = learningPath.courses?.map((pc) => pc.courseId) || [];
  const coursesToAdd = availableCourses.filter((c) => !enrolledCourseIds.includes(c.id));

  return (
    <div className="learning-path-courses-page">
      <div className="page-header">
        <div>
          <h1>Gerenciar Cursos da Trilha</h1>
          <p className="muted">{learningPath.title}</p>
        </div>
        <button onClick={() => navigate("/instructor/learning-paths")} className="btn-secondary">
          Voltar
        </button>
      </div>

      <div className="courses-section">
        <div className="section-header">
          <h2>Cursos na Trilha</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            {showAddForm ? "Cancelar" : "+ Adicionar Curso"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddCourse} className="add-course-form">
            <div className="form-row">
              <div className="form-group">
                <label>Curso *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="">Selecione um curso...</option>
                  {coursesToAdd.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ordem</label>
                <input
                  type="number"
                  value={courseOrder}
                  onChange={(e) => setCourseOrder(e.target.value)}
                  min="0"
                  placeholder="Auto"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                  />
                  Obrigatório
                </label>
              </div>

              <button type="submit" className="btn-primary">
                Adicionar
              </button>
            </div>
          </form>
        )}

        {learningPath.courses && learningPath.courses.length > 0 ? (
          <div className="courses-list">
            {learningPath.courses
              .sort((a, b) => a.order - b.order)
              .map((pathCourse: LearningPathCourse, index: number) => (
                <div key={pathCourse.id} className="course-item">
                  <div className="course-order">{pathCourse.order}</div>
                  <div className="course-info">
                    <h4>{pathCourse.course.title}</h4>
                    <div className="course-meta">
                      {pathCourse.isRequired && (
                        <span className="required-badge">Obrigatório</span>
                      )}
                      {pathCourse.course.durationHours && (
                        <span>{pathCourse.course.durationHours}h</span>
                      )}
                    </div>
                  </div>
                  <div className="course-actions">
                    <button
                      onClick={() => handleReorder(pathCourse.id, "up")}
                      disabled={index === 0}
                      className="btn-icon"
                      title="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(pathCourse.id, "down")}
                      disabled={index === learningPath.courses!.length - 1}
                      className="btn-icon"
                      title="Mover para baixo"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => handleRemoveCourse(pathCourse.courseId)}
                      className="btn-danger"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted">Nenhum curso adicionado ainda.</p>
        )}
      </div>
    </div>
  );
}

