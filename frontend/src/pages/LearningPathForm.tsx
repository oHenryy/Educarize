import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { LearningPath } from "../types";
import { useToast } from "../context/ToastContext";

export default function LearningPathFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coverImageUrl: "",
    difficulty: "",
    estimatedHours: "",
    status: "DRAFT",
  });

  const isEditing = !!id;

  useEffect(() => {
    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }

    if (isEditing && id) {
      fetchLearningPath();
    }
  }, [id, user]);

  const fetchLearningPath = async () => {
    try {
      setLoading(true);
      const res = await api.get<LearningPath>(`/learning-paths/${id}`);
      const path = res.data;
      setFormData({
        title: path.title,
        description: path.description || "",
        coverImageUrl: path.coverImageUrl || "",
        difficulty: path.difficulty || "",
        estimatedHours: path.estimatedHours?.toString() || "",
        status: path.status,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao carregar trilha");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Título é obrigatório", "error");
      return;
    }

    try {
      setLoading(true);
      const data: any = {
        title: formData.title,
        description: formData.description || undefined,
        coverImageUrl: formData.coverImageUrl || undefined,
        difficulty: formData.difficulty || undefined,
        estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
        status: formData.status,
      };

      if (isEditing && id) {
        await api.put(`/learning-paths/${id}`, data);
      } else {
        await api.post("/learning-paths", data);
      }

      navigate("/instructor/learning-paths");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro ao salvar trilha");
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return <div className="loading">Carregando trilha...</div>;
  }

  return (
    <div className="learning-path-form-page">
      <header className="page-header">
        <div>
          <h1>{isEditing ? "Editar Trilha" : "Nova Trilha de Aprendizado"}</h1>
          <p className="muted">
            Defina uma jornada de aprendizado composta por vários cursos, com dificuldade e duração estimada.
          </p>
        </div>
        <button onClick={() => navigate("/instructor/learning-paths")} className="btn-secondary">
          Cancelar
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label>Título *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            placeholder="Ex: Desenvolvimento Web Completo"
          />
        </div>

        <div className="form-group">
          <label>Descrição</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            placeholder="Descreva o objetivo e conteúdo desta trilha..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>URL da Imagem de Capa</label>
            <input
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>

          <div className="form-group">
            <label>Dificuldade</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <option value="">Selecione...</option>
              <option value="BEGINNER">Iniciante</option>
              <option value="INTERMEDIATE">Intermediário</option>
              <option value="ADVANCED">Avançado</option>
            </select>
          </div>

          <div className="form-group">
            <label>Horas Estimadas</label>
            <input
              type="number"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              min="0"
              placeholder="Ex: 40"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Atualizar" : "Criar Trilha"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/instructor/learning-paths")}
            className="btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

