import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { LearningPath, LearningPathCourse, Course, CoursesPage } from "../types";
import { useDebouncedValue } from "../utils/useDebouncedValue";
import { useToast } from "../context/useToast";
import SortableList from "../components/SortableList";

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
  const [courseSearch, setCourseSearch] = useState("");
  const debouncedCourseSearch = useDebouncedValue(courseSearch);
  const { showToast } = useToast();

  const fetchLearningPath = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<LearningPath>(`/learning-paths/${id}`);
      setLearningPath(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar trilha"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Uma trilha pode combinar cursos publicados de qualquer instrutor (busca no servidor, até 50 resultados).
  const fetchAvailableCourses = useCallback(async () => {
    try {
      const res = await api.get<CoursesPage>("/courses", {
        params: { status: "PUBLISHED", limit: 50, search: debouncedCourseSearch || undefined },
      });
      setAvailableCourses(res.data.courses);
    } catch (err) {
      console.error("Erro ao carregar cursos:", err);
    }
  }, [debouncedCourseSearch]);

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }
    if (id) {
      fetchLearningPath();
    }
  }, [id, user, fetchLearningPath, navigate]);

  // Cursos disponíveis: só carregados com o formulário aberto, conforme a busca.
  useEffect(() => {
    if (showAddForm) fetchAvailableCourses();
  }, [showAddForm, fetchAvailableCourses]);

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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao adicionar curso"), "error");
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    if (!confirm("Tem certeza que deseja remover este curso da trilha?")) return;

    try {
      await api.delete(`/learning-paths/${id}/courses/${courseId}`);
      fetchLearningPath();
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao remover curso"), "error");
    }
  };

  // Reordenação otimista: a lista muda na hora e volta ao estado anterior se a API recusar.
  const handleReorder = async (reordered: LearningPathCourse[]) => {
    if (!learningPath) return;
    const previous = learningPath;
    setLearningPath({ ...learningPath, courses: reordered.map((pc, index) => ({ ...pc, order: index })) });
    try {
      // Reordenação atômica no backend (uma única requisição/transação).
      await api.put(`/learning-paths/${id}/courses/reorder`, { courseIds: reordered.map((pc) => pc.courseId) });
    } catch (err) {
      setLearningPath(previous);
      showToast(getErrorMessage(err, "Erro ao reordenar curso"), "error");
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
  const ownCourses = coursesToAdd.filter((c) => c.instructor?.id === learningPath.instructorId);
  const otherCourses = coursesToAdd.filter((c) => c.instructor?.id !== learningPath.instructorId);

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
                <input
                  type="search"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Buscar curso publicado..."
                  style={{ marginBottom: "8px" }}
                />
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="">
                    {coursesToAdd.length === 0 ? "Nenhum curso publicado disponível" : "Selecione um curso..."}
                  </option>
                  {ownCourses.length > 0 && (
                    <optgroup label="Cursos do autor da trilha">
                      {ownCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherCourses.length > 0 && (
                    <optgroup label="Cursos de outros instrutores">
                      {otherCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title} — {course.instructor?.name ?? "Instrutor"}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <small className="muted">Apenas cursos publicados podem ser adicionados.</small>
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
          <SortableList
            className="courses-list"
            items={[...learningPath.courses].sort((a, b) => a.order - b.order)}
            getId={(pathCourse) => pathCourse.id}
            getLabel={(pathCourse) => pathCourse.course.title}
            onReorder={handleReorder}
            itemClassName={() => "course-item"}
          >
            {(pathCourse, handle, index) => (
                <>
                  {handle}
                  <div className="course-order">{index + 1}</div>
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
                      onClick={() => handleRemoveCourse(pathCourse.courseId)}
                      className="btn-danger"
                    >
                      Remover
                    </button>
                  </div>
                </>
            )}
          </SortableList>
        ) : (
          <p className="muted">Nenhum curso adicionado ainda.</p>
        )}
      </div>
    </div>
  );
}

