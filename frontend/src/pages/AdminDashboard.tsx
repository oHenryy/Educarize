import { useEffect, useState } from "react";
import { api } from "../api/client";

interface DashboardStats {
  totals: {
    users: number;
    courses: number;
    enrollments: number;
    lessons: number;
    quizzes: number;
    comments: number;
    certificates: number;
    modules: number;
    quizAttempts: number;
  };
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  recentCourses: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    instructor: { id: string; name: string };
    category: { id: string; name: string } | null;
    _count: { enrollments: number; modules: number };
  }>;
  coursesByStatus: Array<{ status: string; count: number }>;
  usersByRole: Array<{ role: string; count: number }>;
  coursesByCategory: Array<{ categoryId: string | null; categoryName: string; count: number }>;
  coursesByDifficulty: Array<{ difficulty: string; count: number }>;
  topCourses: Array<{
    id: string;
    title: string;
    instructor: string;
    category: string;
    enrollments: number;
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
  quizStats: {
    passed: number;
    failed: number;
    averageScore: number;
  };
  progressStats: {
    completedLessons: number;
    totalProgress: number;
    completionRate: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get<DashboardStats>("/admin/stats");
        setStats(res.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError("Você não tem permissão para acessar esta página");
        } else if (err.response?.status === 401) {
          setError("Sua sessão expirou. Por favor, faça login novamente.");
        } else {
          setError(err.response?.data?.error || "Erro ao carregar estatísticas");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) return <div className="loading">Carregando dashboard...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return null;

  const totalQuizAttempts = stats.quizStats.passed + stats.quizStats.failed;
  const quizPassRate = totalQuizAttempts > 0 
    ? Math.round((stats.quizStats.passed / totalQuizAttempts) * 100) 
    : 0;

  return (
    <div className="admin-dashboard">
      <h1>Dashboard Administrativo</h1>

      {/* Cards de Métricas Principais */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Usuários</h3>
            <p className="stat-number">{stats.totals.users}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <h3>Cursos</h3>
            <p className="stat-number">{stats.totals.courses}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <h3>Matrículas</h3>
            <p className="stat-number">{stats.totals.enrollments}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <h3>Aulas</h3>
            <p className="stat-number">{stats.totals.lessons}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Módulos</h3>
            <p className="stat-number">{stats.totals.modules}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">❓</div>
          <div className="stat-content">
            <h3>Quizzes</h3>
            <p className="stat-number">{stats.totals.quizzes}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>Comentários</h3>
            <p className="stat-number">{stats.totals.comments}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>Certificados</h3>
            <p className="stat-number">{stats.totals.certificates}</p>
          </div>
        </div>
      </div>

      {/* Estatísticas de Engajamento */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Estatísticas de Progresso</h2>
          <div className="engagement-stats">
            <div className="engagement-item">
              <span className="engagement-label">Aulas Concluídas</span>
              <span className="engagement-value">{stats.progressStats.completedLessons}</span>
            </div>
            <div className="engagement-item">
              <span className="engagement-label">Total de Progresso</span>
              <span className="engagement-value">{stats.progressStats.totalProgress}</span>
            </div>
            <div className="engagement-item">
              <span className="engagement-label">Taxa de Conclusão</span>
              <span className="engagement-value">{stats.progressStats.completionRate}%</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Estatísticas de Quizzes</h2>
          <div className="engagement-stats">
            <div className="engagement-item">
              <span className="engagement-label">Tentativas Aprovadas</span>
              <span className="engagement-value success">{stats.quizStats.passed}</span>
            </div>
            <div className="engagement-item">
              <span className="engagement-label">Tentativas Reprovadas</span>
              <span className="engagement-value danger">{stats.quizStats.failed}</span>
            </div>
            <div className="engagement-item">
              <span className="engagement-label">Taxa de Aprovação</span>
              <span className="engagement-value">{quizPassRate}%</span>
            </div>
            <div className="engagement-item">
              <span className="engagement-label">Nota Média</span>
              <span className="engagement-value">{Math.round(stats.quizStats.averageScore)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribuições */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Usuários por Papel</h2>
          <div className="role-stats">
            {stats.usersByRole.map((item) => (
              <div key={item.role} className="role-item">
                <span className="role-name">{item.role}</span>
                <span className="role-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Cursos por Status</h2>
          <div className="status-stats">
            {stats.coursesByStatus.map((item) => (
              <div key={item.status} className="status-item">
                <span className="status-name">{item.status}</span>
                <span className="status-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Cursos por Dificuldade</h2>
          <div className="status-stats">
            {stats.coursesByDifficulty.map((item) => (
              <div key={item.difficulty} className="status-item">
                <span className="status-name">{item.difficulty}</span>
                <span className="status-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {stats.coursesByCategory.length > 0 && (
          <div className="dashboard-section">
            <h2>Cursos por Categoria</h2>
            <div className="status-stats">
              {stats.coursesByCategory.slice(0, 5).map((item, index) => (
                <div key={item.categoryId || `no-category-${index}`} className="status-item">
                  <span className="status-name">{item.categoryName}</span>
                  <span className="status-count">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Cursos Mais Populares */}
      {stats.topCourses.length > 0 && (
        <div className="dashboard-section full-width">
          <h2>Cursos Mais Populares</h2>
          <div className="top-courses-list">
            {stats.topCourses.map((course, index) => (
              <div key={course.id} className="top-course-item">
                <div className="top-course-rank">#{index + 1}</div>
                <div className="top-course-content">
                  <strong>{course.title}</strong>
                  <small>{course.instructor} • {course.category}</small>
                </div>
                <div className="top-course-enrollments">
                  <span className="enrollment-badge">{course.enrollments} matrículas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atividade Recente */}
      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Usuários Recentes</h2>
          <div className="recent-list">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="recent-item">
                <div className="recent-item-content">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </div>
                <div className="recent-item-meta">
                  <span className={`badge role-${user.role.toLowerCase()}`}>{user.role}</span>
                  <small>{formatDateShort(user.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Cursos Recentes</h2>
          <div className="recent-list">
            {stats.recentCourses.map((course) => (
              <div key={course.id} className="recent-item">
                <div className="recent-item-content">
                  <strong>{course.title}</strong>
                  <small>Por {course.instructor.name} • {course._count.modules} módulos • {course._count.enrollments} matrículas</small>
                </div>
                <div className="recent-item-meta">
                  <span className={`badge status-${course.status.toLowerCase()}`}>
                    {course.status}
                  </span>
                  <small>{formatDateShort(course.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matrículas e Comentários Recentes */}
      <div className="dashboard-grid">
        {stats.recentEnrollments.length > 0 && (
          <div className="dashboard-section">
            <h2>Matrículas Recentes</h2>
            <div className="recent-list">
              {stats.recentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="recent-item">
                  <div className="recent-item-content">
                    <strong>{enrollment.userName}</strong>
                    <small>{enrollment.courseTitle}</small>
                  </div>
                  <div className="recent-item-meta">
                    <small>{formatDate(enrollment.enrolledAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.recentComments.length > 0 && (
          <div className="dashboard-section">
            <h2>Comentários Recentes</h2>
            <div className="recent-list">
              {stats.recentComments.map((comment) => (
                <div key={comment.id} className="recent-item">
                  <div className="recent-item-content">
                    <strong>{comment.userName}</strong>
                    <small>{comment.courseTitle} • {comment.lessonTitle}</small>
                    <p className="comment-preview">{comment.content}</p>
                  </div>
                  <div className="recent-item-meta">
                    <small>{formatDate(comment.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
