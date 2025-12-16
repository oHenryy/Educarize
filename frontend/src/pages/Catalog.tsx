import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Course, CourseCategory } from "../types";

export default function CatalogPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar cursos publicados
        const params: any = { status: "PUBLISHED" };
        if (selectedCategory) params.categoryId = selectedCategory;
        if (selectedDifficulty) params.difficulty = selectedDifficulty;
        if (searchTerm) params.search = searchTerm;

        const [coursesRes, categoriesRes, enrollmentsRes] = await Promise.all([
          api.get<Course[]>("/courses", { params }),
          api.get<CourseCategory[]>("/categories"),
          user?.role === "STUDENT" ? api.get("/enrollments/my") : Promise.resolve({ data: [] }),
        ]);

        setCourses(coursesRes.data);
        setCategories(categoriesRes.data);
        
        if (user?.role === "STUDENT" && enrollmentsRes.data) {
          const enrolledIds = enrollmentsRes.data.map((e: any) => e.courseId);
          setMyEnrollments(enrolledIds);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedCategory, selectedDifficulty, searchTerm, user]);

  const handleEnroll = async (courseId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await api.post("/enrollments", { courseId });
      setMyEnrollments([...myEnrollments, courseId]);
      alert("Matriculado com sucesso!");
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao se matricular");
    }
  };

  const isEnrolled = (courseId: string) => myEnrollments.includes(courseId);

  if (loading) return <div className="loading">Carregando cursos...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h2>Catálogo de Cursos</h2>
        {user?.role === "INSTRUCTOR" || user?.role === "ADMIN" ? (
          <Link to="/instructor/courses" className="btn-primary">
            Meus Cursos
          </Link>
        ) : null}
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar cursos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
        >
          <option value="">Todas as dificuldades</option>
          <option value="BEGINNER">Iniciante</option>
          <option value="INTERMEDIATE">Intermediário</option>
          <option value="ADVANCED">Avançado</option>
        </select>
      </div>

      {courses.length === 0 && (
        <p className="muted">Nenhum curso encontrado.</p>
      )}
      
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
                  <span>{course.difficulty ?? "BEGINNER"}</span>
                  <span>{course.durationHours ?? 0}h</span>
                  {course.category && <span>{course.category.name}</span>}
                </div>
                <small className="muted">
                  Instrutor: {course.instructor?.name ?? "N/D"}
                </small>
              </div>
            </Link>
            {user?.role === "STUDENT" && (
              <div className="course-actions">
                {isEnrolled(course.id) ? (
                  <span className="badge-enrolled">Matriculado</span>
                ) : (
                  <button
                    onClick={(e) => handleEnroll(course.id, e)}
                    className="btn-enroll"
                  >
                    Matricular-se
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
