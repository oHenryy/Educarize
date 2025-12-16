import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Course, Lesson, Module, CourseProgress } from "../types";
import VideoPlayer from "../components/VideoPlayer";

type CourseResponse = Course & {
  modules: (Module & { lessons: Lesson[] })[];
};

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [currentLessonProgress, setCurrentLessonProgress] = useState<boolean>(false);

  useEffect(() => {
    // Resetar estado quando o ID mudar
    setCourse(null);
    setCurrentLesson(null);
    setIsEnrolled(false);
    setError(null);
    setLoading(true);

    async function fetchCourse() {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const [courseRes, enrollmentsRes] = await Promise.all([
          api.get<CourseResponse>(`/courses/${id}`),
          user?.role === "STUDENT" ? api.get("/enrollments/my") : Promise.resolve({ data: [] }),
        ]);

        setCourse(courseRes.data);
        const firstLesson = courseRes.data.modules?.[0]?.lessons?.[0] ?? null;
        setCurrentLesson(firstLesson || null);

        // Verificar se está matriculado
        let enrolled = false;
        if (user?.role === "STUDENT" && enrollmentsRes.data) {
          enrolled = enrollmentsRes.data.some((e: any) => e.courseId === id);
          setIsEnrolled(enrolled);
        } else if (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
          // Instrutores e admins podem ver seus próprios cursos
          enrolled = true;
          setIsEnrolled(true);
        }

        // Carregar progresso se estiver matriculado
        if (enrolled || user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
          try {
            const progressRes = await api.get<CourseProgress>(`/progress/course/${id}`);
            setProgress(progressRes.data);
          } catch (progressErr) {
            // Progresso pode não existir ainda, não é erro crítico
            console.warn("Erro ao carregar progresso:", progressErr);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar curso");
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id, user]);

  // Carregar progresso da aula atual quando mudar
  useEffect(() => {
    if (!currentLesson || !currentLesson.id || !isEnrolled) {
      setCurrentLessonProgress(false);
      return;
    }

    const lessonId = currentLesson.id;
    async function fetchLessonProgress() {
      try {
        const res = await api.get(`/progress/lesson/${lessonId}`);
        setCurrentLessonProgress(res.data.completed || false);
      } catch (err) {
        setCurrentLessonProgress(false);
      }
    }

    fetchLessonProgress();
  }, [currentLesson?.id, isEnrolled]);

  // Atualizar progresso quando mudar a aula atual
  useEffect(() => {
    if (progress && currentLesson?.id) {
      const lessonProgress = progress.lessons.find((l) => l.lessonId === currentLesson.id);
      setCurrentLessonProgress(lessonProgress?.completed || false);
    }
  }, [currentLesson?.id, progress]);

  const handleEnroll = async () => {
    if (!id) return;
    try {
      await api.post("/enrollments", { courseId: id });
      setIsEnrolled(true);
      alert("Matriculado com sucesso!");
      // Recarregar progresso após matrícula
      try {
        const progressRes = await api.get<CourseProgress>(`/progress/course/${id}`);
        setProgress(progressRes.data);
      } catch (progressErr) {
        console.warn("Erro ao carregar progresso:", progressErr);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao se matricular");
    }
  };

  const handleToggleLessonComplete = async () => {
    if (!currentLesson?.id) return;

    try {
      if (currentLessonProgress) {
        await api.post("/progress/incomplete", { lessonId: currentLesson.id });
        setCurrentLessonProgress(false);
      } else {
        await api.post("/progress/complete", { lessonId: currentLesson.id });
        setCurrentLessonProgress(true);
      }

      // Atualizar progresso do curso
      if (id) {
        const progressRes = await api.get<CourseProgress>(`/progress/course/${id}`);
        setProgress(progressRes.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao atualizar progresso");
    }
  };

  const isInstructor = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";
  const canViewStudents = isInstructor && (course?.instructor?.id === user?.id || user?.role === "ADMIN");

  if (loading) return <div className="loading">Carregando curso...</div>;
  if (error) return <p className="error">{error}</p>;
  if (!course) return <p>Curso não encontrado</p>;

  // Se não está matriculado e não é instrutor/admin, mostrar botão de matrícula
  if (!isEnrolled && user?.role === "STUDENT") {
    return (
      <div className="course-enroll-prompt">
        <div className="enroll-card">
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <div className="course-info">
            <span>Dificuldade: {course.difficulty}</span>
            <span>Carga horária: {course.durationHours}h</span>
            {course.category && <span>Categoria: {course.category.name}</span>}
          </div>
          <button onClick={handleEnroll} className="btn-primary">
            Matricular-se neste curso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="player">
        <div className="player-header">
          <h2>{currentLesson?.title ?? course.title}</h2>
          {canViewStudents && (
            <button
              onClick={() => navigate(`/instructor/courses/${id}/students`)}
              className="btn-secondary"
            >
              Ver Alunos
            </button>
          )}
        </div>
        {currentLesson ? (
          <>
            <VideoPlayer videoUrl={currentLesson.videoUrl} />
            {currentLesson.description && (
              <div className="lesson-description">
                <h3>Descrição</h3>
                <p>{currentLesson.description}</p>
              </div>
            )}
            {isEnrolled && user?.role === "STUDENT" && (
              <div className="lesson-actions">
                <button
                  onClick={handleToggleLessonComplete}
                  className={`btn-${currentLessonProgress ? "success" : "primary"}`}
                >
                  {currentLessonProgress ? "✓ Aula Concluída" : "Marcar como Concluída"}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="video-placeholder">
            <p>Selecione uma aula na barra lateral</p>
          </div>
        )}
      </div>
      <aside className="sidebar">
        <h3>{course.title}</h3>
        <p className="muted">{course.description}</p>
        <div className="course-info-sidebar">
          <div className="info-item">
            <strong>Dificuldade:</strong> {course.difficulty}
          </div>
          <div className="info-item">
            <strong>Carga horária:</strong> {course.durationHours}h
          </div>
          {course.category && (
            <div className="info-item">
              <strong>Categoria:</strong> {course.category.name}
            </div>
          )}
          {progress && isEnrolled && (
            <div className="progress-info">
              <div className="progress-header">
                <strong>Progresso do Curso</strong>
                <span>{progress.progressPercentage}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.progressPercentage}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {progress.completedLessons} de {progress.totalLessons} aulas concluídas
              </p>
            </div>
          )}
        </div>
        <div className="module-list">
          {course.modules?.map((mod) => (
            <div key={mod.id} className="module">
              <h4>{mod.title}</h4>
              <ul>
                {mod.lessons?.map((lesson) => {
                  const lessonProgress = progress?.lessons.find((l) => l.lessonId === lesson.id);
                  const isCompleted = lessonProgress?.completed || false;
                  return (
                    <li
                      key={lesson.id}
                      className={`${lesson.id === currentLesson?.id ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                      onClick={() => setCurrentLesson(lesson)}
                    >
                      {isCompleted && <span className="check-icon">✓</span>}
                      {lesson.title}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
