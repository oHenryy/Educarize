import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Course } from "../types";

export default function InstructorCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Resetar estado
    setCourses([]);
    setError(null);
    setLoading(true);

    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }

    async function fetchCourses() {
      try {
        const { data } = await api.get<Course[]>("/courses");
        // Filtrar apenas cursos do instrutor (ou todos se for admin)
        const myCourses = user?.role === "ADMIN" 
          ? data 
          : data.filter(c => c.instructor?.id === user?.id);
        setCourses(myCourses);
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar cursos");
      } finally {
        setLoading(false);
      }
    }
    fetchCourses();
  }, [user, navigate]);

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="instructor-courses">
      <div className="page-header">
        <h2>Meus Cursos</h2>
        <button onClick={() => navigate("/instructor/courses/new")} className="btn-primary">
          Criar Novo Curso
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não criou nenhum curso.</p>
          <button onClick={() => navigate("/instructor/courses/new")} className="btn-primary">
            Criar Primeiro Curso
          </button>
        </div>
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
    </div>
  );
}

