import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { Course, CoursesPage } from "../types";
import { Pagination } from "../components/Pagination";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";

export default function InstructorCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCourses([]);
    setError(null);
    setLoading(true);

    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }

    async function fetchCourses() {
      try {
        // Admin vê todos os cursos; instrutor vê apenas os seus (inclusive rascunhos).
        const { data } = await api.get<CoursesPage>("/courses", {
          params: { page, limit: 12, ...(user?.role === "ADMIN" ? {} : { instructorId: user?.id }) },
        });
        setCourses(data.courses);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        setError(getErrorMessage(err, "Erro ao carregar cursos"));
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [user, navigate, page]);

  if (loading) return <div className="loading">Carregando cursos...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="instructor-courses">
      <PageHeader
        title="Meus Cursos"
        subtitle="Gerencie os cursos que você ministra: edite conteúdo, acompanhe alunos e publique novos materiais."
        actions={
          <button onClick={() => navigate("/instructor/courses/new")} className="btn-primary">
            + Novo Curso
          </button>
        }
      />

      {courses.length === 0 ? (
        <EmptyState
          title="Nenhum curso encontrado"
          description="Crie seu primeiro curso para começar a ensinar e acompanhar seus alunos."
        >
          <button onClick={() => navigate("/instructor/courses/new")} className="btn-primary">
            Criar Primeiro Curso
          </button>
        </EmptyState>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <Link to={`/course/${course.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {course.coverImageUrl ? (
                  <img src={course.coverImageUrl} alt={course.title} />
                ) : (
                  <div className="placeholder-img">Sem capa</div>
                )}
                <div className="course-body">
                  <h3>{course.title}</h3>
                  <p className="muted">{course.description}</p>
                  <div className="course-meta">
                    <span className={`status-badge status-${course.status?.toLowerCase()}`}>
                      {course.status}
                    </span>
                    <span>{course.difficulty}</span>
                    <span>{course.durationHours}h</span>
                  </div>
                </div>
              </Link>
              <div className="course-actions">
                <button
                  onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                  className="btn-secondary"
                >
                  Editar
                </button>
                <button
                  onClick={() => navigate(`/instructor/courses/${course.id}/content`)}
                  className="btn-secondary"
                >
                  Conteúdo
                </button>
                <button
                  onClick={() => navigate(`/instructor/courses/${course.id}/students`)}
                  className="btn-secondary"
                >
                  Alunos
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

