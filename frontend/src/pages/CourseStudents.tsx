import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { User } from "../types";

type Enrollment = {
  id: string;
  enrolledAt: string;
  user: User;
};

export default function CourseStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Resetar estado quando o ID mudar
    setEnrollments([]);
    setCourseTitle("");
    setError(null);
    setLoading(true);

    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [studentsRes, courseRes] = await Promise.all([
          api.get<Enrollment[]>(`/courses/${id}/students`),
          api.get(`/courses/${id}`),
        ]);

        setEnrollments(studentsRes.data);
        setCourseTitle(courseRes.data.title);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError("Você não tem permissão para ver os alunos deste curso");
        } else {
          setError(err.response?.data?.error || "Erro ao carregar alunos");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="loading">Carregando alunos...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="course-students">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Voltar
          </button>
          <h2>Alunos Matriculados</h2>
          <p className="muted">{courseTitle}</p>
        </div>
      </div>

      {enrollments.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum aluno matriculado neste curso ainda.</p>
        </div>
      ) : (
        <div className="students-list">
          <div className="students-header">
            <span>Total: {enrollments.length} aluno(s)</span>
          </div>
          <table className="students-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Data de Matrícula</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>
                    <div className="student-info">
                      {enrollment.user.avatarUrl ? (
                        <img
                          src={enrollment.user.avatarUrl}
                          alt={enrollment.user.name}
                          className="student-avatar"
                        />
                      ) : (
                        <div className="student-avatar-placeholder">
                          {enrollment.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>{enrollment.user.name}</span>
                    </div>
                  </td>
                  <td>{enrollment.user.email}</td>
                  <td>
                    {new Date(enrollment.enrolledAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

