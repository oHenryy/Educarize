import { useEffect, useState } from "react";
import { api } from "../api/client";

interface InstructorDashboardStats {
  totals: {
    courses: number;
    publishedCourses: number;
    enrollments: number;
    students: number;
    lessons: number;
    quizzes: number;
    comments: number;
    certificates: number;
  };
  courses: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    enrollments: number;
    modules: number;
    createdAt: string;
  }>;
  enrollmentsOverTime: Array<{
    date: string;
    count: number;
  }>;
  completionRates: Array<{
    courseId: string;
    courseTitle: string;
    completionRate: number;
    totalStudents: number;
    completedStudents: number;
  }>;
  quizPerformance: Array<{
    quizId: string;
    quizTitle: string;
    courseTitle: string;
    totalAttempts: number;
    passedAttempts: number;
    failedAttempts: number;
    averageScore: number;
    passRate: number;
  }>;
  topStudents: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    coursesEnrolled: number;
    lessonsCompleted: number;
    certificatesEarned: number;
    quizzesPassed: number;
    averageQuizScore: number;
  }>;
  recentEnrollments: Array<{
    id: string;
    userName: string;
    userEmail: string;
    courseTitle: string;
    enrolledAt: string;
  }>;
  recentComments: Array<{
    id: string;
    userName: string;
    courseTitle: string;
    lessonTitle: string;
    content: string;
    createdAt: string;
  }>;
  averageRatings: {
    overallAverage: number;
    byCourse: Array<{
      courseId: string;
      courseTitle: string;
      averageRating: number;
      totalReviews: number;
    }>;
  };
}

export default function InstructorDashboardPage() {
  const [stats, setStats] = useState<InstructorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get<InstructorDashboardStats>("/instructor/dashboard/stats");
      setStats(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Carregando dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  return (
    <div className="instructor-dashboard">
      <header className="page-header">
        <div>
          <h1>Dashboard do Instrutor</h1>
          <p className="muted">
            Acompanhe o desempenho dos seus cursos, alunos, quizzes e avaliações em um só lugar.
          </p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Total de Cursos</h3>
            <p className="stat-number">{stats.totals.courses}</p>
            <small>{stats.totals.publishedCourses} publicados</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Alunos</h3>
            <p className="stat-number">{stats.totals.students}</p>
            <small>{stats.totals.enrollments} matrículas</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📖</div>
          <div className="stat-content">
            <h3>Aulas</h3>
            <p className="stat-number">{stats.totals.lessons}</p>
            <small>{stats.totals.quizzes} quizzes</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Certificados</h3>
            <p className="stat-number">{stats.totals.certificates}</p>
            <small>Emitidos</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <h3>Avaliação Média</h3>
            <p className="stat-number">{stats.averageRatings.overallAverage.toFixed(1)}</p>
            <small>de 5 estrelas</small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>Comentários</h3>
            <p className="stat-number">{stats.totals.comments}</p>
            <small>Total</small>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Matrículas (Últimos 30 dias)</h2>
          <div className="chart-container">
            <div className="simple-chart">
              {stats.enrollmentsOverTime.map((item, index) => {
                const maxCount = Math.max(...stats.enrollmentsOverTime.map((i) => i.count), 1);
                const height = maxCount > 0 ? Math.max((item.count / maxCount) * 100, 2) : 2;
                return (
                  <div key={index} className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{ height: `${height}%` }}
                      title={`${item.date}: ${item.count} matrícula${item.count !== 1 ? "s" : ""}`}
                    >
                      {item.count > 0 && <span className="chart-value">{item.count}</span>}
                    </div>
                    <small className="chart-label">
                      {new Date(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </small>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Taxa de Conclusão por Curso</h2>
          <div className="completion-list">
            {stats.completionRates.length === 0 ? (
              <p className="muted">Nenhum dado disponível</p>
            ) : (
              stats.completionRates.map((course) => (
                <div key={course.courseId} className="completion-item">
                  <div className="completion-header">
                    <strong>{course.courseTitle}</strong>
                    <span className="completion-percentage">{course.completionRate}%</span>
                  </div>
                  <div className="completion-bar">
                    <div
                      className="completion-fill"
                      style={{ width: `${course.completionRate}%` }}
                    ></div>
                  </div>
                  <small>
                    {course.completedStudents} de {course.totalStudents} alunos completaram
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Desempenho em Quizzes</h2>
          <div className="quiz-performance-list">
            {stats.quizPerformance.length === 0 ? (
              <p className="muted">Nenhum quiz disponível</p>
            ) : (
              stats.quizPerformance.map((quiz) => (
                <div key={quiz.quizId} className="quiz-performance-item">
                  <div className="quiz-performance-header">
                    <div>
                      <strong>{quiz.quizTitle}</strong>
                      <small>{quiz.courseTitle}</small>
                    </div>
                    <div className="quiz-performance-stats">
                      <span className="stat-badge success">{quiz.passedAttempts} aprovados</span>
                      <span className="stat-badge danger">{quiz.failedAttempts} reprovados</span>
                    </div>
                  </div>
                  <div className="quiz-performance-details">
                    <div>
                      <span>Taxa de aprovação: </span>
                      <strong>{quiz.passRate}%</strong>
                    </div>
                    <div>
                      <span>Nota média: </span>
                      <strong>{quiz.averageScore}%</strong>
                    </div>
                    <div>
                      <span>Total de tentativas: </span>
                      <strong>{quiz.totalAttempts}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Top Alunos</h2>
          <div className="top-students-list">
            {stats.topStudents.length === 0 ? (
              <p className="muted">Nenhum aluno ainda</p>
            ) : (
              stats.topStudents.map((student, index) => (
                <div key={student.userId} className="top-student-item">
                  <div className="student-rank">#{index + 1}</div>
                  <div className="student-info">
                    <strong>{student.userName}</strong>
                    <small>{student.userEmail}</small>
                  </div>
                  <div className="student-stats">
                    <div className="student-stat">
                      <span className="stat-label">Aulas:</span>
                      <span className="stat-value">{student.lessonsCompleted}</span>
                    </div>
                    <div className="student-stat">
                      <span className="stat-label">Certificados:</span>
                      <span className="stat-value">{student.certificatesEarned}</span>
                    </div>
                    {student.averageQuizScore > 0 && (
                      <div className="student-stat">
                        <span className="stat-label">Nota média:</span>
                        <span className="stat-value">{student.averageQuizScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Avaliações dos Cursos</h2>
          <div className="ratings-list">
            {stats.averageRatings.byCourse.length === 0 ? (
              <p className="muted">Nenhuma avaliação ainda</p>
            ) : (
              stats.averageRatings.byCourse.map((rating) => (
                <div key={rating.courseId} className="rating-item">
                  <div className="rating-header">
                    <strong>{rating.courseTitle}</strong>
                    <div className="rating-stars">
                      {"★".repeat(Math.round(rating.averageRating))}
                      {"☆".repeat(5 - Math.round(rating.averageRating))}
                      <span className="rating-value">{rating.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <small>{rating.totalReviews} {rating.totalReviews === 1 ? "avaliação" : "avaliações"}</small>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Matrículas Recentes</h2>
          <div className="recent-list">
            {stats.recentEnrollments.length === 0 ? (
              <p className="muted">Nenhuma matrícula recente</p>
            ) : (
              stats.recentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="recent-item">
                  <div className="recent-item-content">
                    <strong>{enrollment.userName}</strong>
                    <small>{enrollment.courseTitle}</small>
                  </div>
                  <div className="recent-item-meta">
                    <small>{new Date(enrollment.enrolledAt).toLocaleDateString("pt-BR")}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section full-width">
        <h2>Comentários Recentes</h2>
        <div className="comments-list-dashboard">
          {stats.recentComments.length === 0 ? (
            <p className="muted">Nenhum comentário recente</p>
          ) : (
            stats.recentComments.map((comment) => (
              <div key={comment.id} className="comment-item-dashboard">
                <div className="comment-header-dashboard">
                  <strong>{comment.userName}</strong>
                  <small>{new Date(comment.createdAt).toLocaleDateString("pt-BR")}</small>
                </div>
                <div className="comment-meta-dashboard">
                  <span>{comment.courseTitle}</span> • <span>{comment.lessonTitle}</span>
                </div>
                <p className="comment-content-dashboard">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

