import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { CourseCategory } from "../types";
import { useToast } from "../context/ToastContext";

type CourseFormData = {
  title: string;
  description: string;
  coverImageUrl: string;
  durationHours: number;
  difficulty: string;
  categoryId: string;
  status: string;
};

export default function CourseFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { showToast } = useToast();

  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    coverImageUrl: "",
    durationHours: 0,
    difficulty: "BEGINNER",
    categoryId: "",
    status: "DRAFT",
  });

  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
      title: "",
      description: "",
      coverImageUrl: "",
      durationHours: 0,
      difficulty: "BEGINNER",
      categoryId: "",
      status: "DRAFT",
    });
    setError(null);
    setLoading(false);

    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }

    async function fetchData() {
      try {
        const categoriesRes = await api.get<CourseCategory[]>("/categories");
        setCategories(categoriesRes.data);

        if (isEdit && id) {
          setLoading(true);
          const courseRes = await api.get(`/courses/${id}`);
          const course = courseRes.data;
          
          if (course.instructor?.id !== user?.id && user?.role !== "ADMIN") {
            navigate("/instructor/courses");
            return;
          }

          setFormData({
            title: course.title || "",
            description: course.description || "",
            coverImageUrl: course.coverImageUrl || "",
            durationHours: course.durationHours || 0,
            difficulty: course.difficulty || "BEGINNER",
            categoryId: course.categoryId || "",
            status: course.status || "DRAFT",
          });
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, isEdit, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        await api.put(`/courses/${id}`, formData);
        showToast("Curso atualizado com sucesso!", "success");
      } else {
        const { data } = await api.post("/courses", formData);
        showToast("Curso criado com sucesso!", "success");
        navigate(`/instructor/courses/${data.id}/edit`);
      }
      navigate("/instructor/courses");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao salvar curso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-form-page">
      <header className="page-header">
        <div>
          <h1>{isEdit ? "Editar Curso" : "Criar Novo Curso"}</h1>
          <p className="muted">
            Defina as informações principais do curso. Depois você poderá organizar módulos, aulas e quizzes.
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          ← Voltar
        </button>
      </header>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="course-form">
        <div className="form-group">
          <label htmlFor="title">Título *</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Descrição</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="coverImageUrl">URL da Capa</label>
            <input
              id="coverImageUrl"
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="durationHours">Carga Horária (horas)</label>
            <input
              id="durationHours"
              type="number"
              min="0"
              value={formData.durationHours}
              onChange={(e) => setFormData({ ...formData, durationHours: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="difficulty">Dificuldade</label>
            <select
              id="difficulty"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <option value="BEGINNER">Iniciante</option>
              <option value="INTERMEDIATE">Intermediário</option>
              <option value="ADVANCED">Avançado</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="categoryId">Categoria</label>
            <select
              id="categoryId"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isEdit && (
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
              <option value="SUSPENDED">Suspenso</option>
            </select>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Atualizar" : "Criar"}
          </button>
        </div>
      </form>
    </div>
  );
}

