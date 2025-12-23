import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Tag, CourseTag } from "../types";
import { useToast } from "../context/ToastContext";

interface CourseTagsProps {
  courseId: string;
  canEdit?: boolean;
}

export default function CourseTags({ courseId, canEdit = false }: CourseTagsProps) {
  const { user } = useAuth();
  const [tags, setTags] = useState<CourseTag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedTagId, setSelectedTagId] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    fetchTags();
    if (canEdit) {
      fetchAllTags();
    }
  }, [courseId, canEdit]);

  const fetchTags = async () => {
    try {
      const res = await api.get<CourseTag[]>(`/tags/courses/${courseId}`);
      setTags(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar tags:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const res = await api.get<Tag[]>("/tags");
      setAllTags(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar todas as tags:", err);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim() && !selectedTagId) {
      showToast("Por favor, selecione uma tag ou digite um nome", "error");
      return;
    }

    try {
      if (selectedTagId) {
        await api.post(`/tags/courses/${courseId}`, { tagName: allTags.find(t => t.id === selectedTagId)?.name || "" });
      } else {
        await api.post(`/tags/courses/${courseId}`, { tagName: newTagName.trim() });
      }
      setNewTagName("");
      setSelectedTagId("");
      setShowAddForm(false);
      fetchTags();
      fetchAllTags();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao adicionar tag", "error");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!confirm("Deseja remover esta tag?")) return;

    try {
      await api.delete(`/tags/courses/${courseId}/${tagId}`);
      fetchTags();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao remover tag", "error");
    }
  };

  if (loading) return <div className="loading">Carregando tags...</div>;

  return (
    <div className="course-tags">
      <div className="tags-header">
        <h4>Tags</h4>
        {canEdit && (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") && (
          <button onClick={() => setShowAddForm(!showAddForm)} className="btn-secondary-small">
            {showAddForm ? "Cancelar" : "+ Adicionar Tag"}
          </button>
        )}
      </div>

      {showAddForm && canEdit && (
        <div className="add-tag-form">
          <select
            value={selectedTagId}
            onChange={(e) => setSelectedTagId(e.target.value)}
            style={{ marginBottom: "0.5rem" }}
          >
            <option value="">Ou selecione uma tag existente</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} ({tag._count?.courses || 0} cursos)
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Ou digite o nome de uma nova tag"
            style={{ marginBottom: "0.5rem" }}
          />
          <button onClick={handleAddTag} className="btn-primary-small" disabled={!newTagName.trim() && !selectedTagId}>
            Adicionar
          </button>
        </div>
      )}

      <div className="tags-list">
        {tags.length === 0 ? (
          <p className="muted">Nenhuma tag adicionada</p>
        ) : (
          tags.map((courseTag) => (
            <span key={courseTag.id} className="tag-badge">
              {courseTag.tag.name}
              {canEdit && (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") && (
                <button
                  onClick={() => handleRemoveTag(courseTag.tagId)}
                  className="tag-remove"
                  title="Remover tag"
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

