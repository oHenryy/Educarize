import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage } from "../api/client";
import type { LessonAttachment } from "../types";

interface LessonAttachmentsProps {
  lessonId: string;
  canEdit?: boolean;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  PDF: "📄",
  ZIP: "📦",
  VIDEO: "🎥",
  LINK: "🔗",
  DOCUMENT: "📝",
  IMAGE: "🖼️",
  OTHER: "📎",
};

const CATEGORY_LABELS: Record<string, string> = {
  EXERCISE: "Exercício",
  REFERENCE: "Referência",
  TEMPLATE: "Template",
  SLIDES: "Apresentação",
  CODE: "Código",
  OTHER: "Outro",
};

export default function LessonAttachments({ lessonId, canEdit = false }: LessonAttachmentsProps) {
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fileUrl: "",
    fileType: "PDF",
    fileSize: "",
    category: "",
    order: "",
    thumbnailUrl: "",
  });

  const fetchAttachments = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterCategory ? { category: filterCategory } : {};
      const res = await api.get(`/lessons/${lessonId}/attachments`, { params });
      setAttachments(res.data);
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao carregar materiais"));
    } finally {
      setLoading(false);
    }
  }, [filterCategory, lessonId]);

  useEffect(() => {
    fetchAttachments();
  }, [lessonId, filterCategory, fetchAttachments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || undefined,
        fileUrl: formData.fileUrl,
        fileType: formData.fileType,
        category: formData.category || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
      };

      if (formData.fileSize) {
        data.fileSize = parseInt(formData.fileSize);
      }
      if (formData.order) {
        data.order = parseInt(formData.order);
      }

      if (editingId) {
        await api.put(`/lessons/attachments/${editingId}`, data);
      } else {
        await api.post(`/lessons/${lessonId}/attachments`, data);
      }

      setShowAddForm(false);
      setEditingId(null);
      resetForm();
      fetchAttachments();
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao salvar material"));
    }
  };

  const handleEdit = (attachment: LessonAttachment) => {
    setEditingId(attachment.id);
    setFormData({
      name: attachment.name,
      description: attachment.description || "",
      fileUrl: attachment.fileUrl,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize?.toString() || "",
      category: attachment.category || "",
      order: attachment.order?.toString() || "",
      thumbnailUrl: attachment.thumbnailUrl || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este material?")) return;

    try {
      await api.delete(`/lessons/attachments/${id}`);
      fetchAttachments();
    } catch (err) {
      setError(getErrorMessage(err, "Erro ao excluir material"));
    }
  };

  const openSafely = (url: string) => {
    // Só abre links http(s): bloqueia javascript:, data: e similares.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      window.open(parsed.href, "_blank", "noopener,noreferrer");
    } catch {
      setError("Link do material inválido");
    }
  };

  const handleDownload = async (attachment: LessonAttachment) => {
    try {
      await api.post(`/lessons/attachments/${attachment.id}/download`);
    } catch (err) {
      console.error("Erro ao registrar download:", err);
    }
    openSafely(attachment.fileUrl);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      fileUrl: "",
      fileType: "PDF",
      fileSize: "",
      category: "",
      order: "",
      thumbnailUrl: "",
    });
  };

  const categories = ["EXERCISE", "REFERENCE", "TEMPLATE", "SLIDES", "CODE", "OTHER"];
  const fileTypes = ["PDF", "ZIP", "VIDEO", "LINK", "DOCUMENT", "IMAGE", "OTHER"];

  const filteredAttachments = filterCategory
    ? attachments.filter((att) => att.category === filterCategory)
    : attachments;

  const groupedAttachments = filteredAttachments.reduce((acc, att) => {
    const cat = att.category || "OTHER";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(att);
    return acc;
  }, {} as Record<string, LessonAttachment[]>);

  if (loading) {
    return <div className="attachments-loading">Carregando materiais...</div>;
  }

  return (
    <div className="lesson-attachments">
      <div className="attachments-header">
        <h3>📚 Materiais de Apoio</h3>
        <div className="attachments-actions">
          {filterCategory && (
            <button
              type="button"
              onClick={() => setFilterCategory("")}
              className="btn-secondary btn-small"
            >
              Limpar filtro
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (showAddForm) {
                  setEditingId(null);
                  resetForm();
                }
              }}
              className="btn-primary btn-small"
            >
              {showAddForm ? "Cancelar" : "Adicionar Material"}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="attachment-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Tipo *</label>
              <select
                value={formData.fileType}
                onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                required
              >
                {fileTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>URL do Arquivo *</label>
              <input
                type="url"
                value={formData.fileUrl}
                onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tamanho (bytes)</label>
              <input
                type="number"
                value={formData.fileSize}
                onChange={(e) => setFormData({ ...formData, fileSize: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Ordem</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>URL da Miniatura</label>
              <input
                type="url"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">
            {editingId ? "Atualizar" : "Adicionar"}
          </button>
        </form>
      )}

      {filteredAttachments.length === 0 ? (
        <div className="empty-attachments">
          <p>Nenhum material de apoio disponível para esta aula.</p>
        </div>
      ) : (
        <>
          <div className="category-filters">
            {Object.keys(groupedAttachments).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-filter ${filterCategory === cat ? "active" : ""}`}
                onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
              >
                {CATEGORY_LABELS[cat] || "Outro"} ({groupedAttachments[cat].length})
              </button>
            ))}
          </div>

          {Object.entries(groupedAttachments).map(([category, atts]) => (
            <div key={category} className="attachment-category-group">
              {!filterCategory && (
                <h4 className="category-title">
                  {CATEGORY_LABELS[category] || "Outro"}
                </h4>
              )}
              <div className="attachments-list">
                {atts.map((attachment) => (
                  <div key={attachment.id} className="attachment-item">
                    {attachment.thumbnailUrl ? (
                      <img
                        src={attachment.thumbnailUrl}
                        alt={attachment.name}
                        className="attachment-thumbnail"
                      />
                    ) : (
                      <div className="attachment-icon">
                        {FILE_TYPE_ICONS[attachment.fileType] || FILE_TYPE_ICONS.OTHER}
                      </div>
                    )}
                    <div className="attachment-content">
                      <h5>{attachment.name}</h5>
                      {attachment.description && (
                        <p className="attachment-description">{attachment.description}</p>
                      )}
                      <div className="attachment-meta">
                        <span className="file-type">{attachment.fileType}</span>
                        {attachment.fileSize && (
                          <span className="file-size">
                            {(attachment.fileSize / 1024).toFixed(1)} KB
                          </span>
                        )}
                        {attachment.downloadCount > 0 && (
                          <span className="download-count">
                            {attachment.downloadCount} {attachment.downloadCount === 1 ? "download" : "downloads"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="attachment-actions">
                      <button
                        type="button"
                        onClick={() => handleDownload(attachment)}
                        className="btn-primary btn-small"
                      >
                        Download
                      </button>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEdit(attachment)}
                            className="btn-secondary btn-small"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(attachment.id)}
                            className="btn-danger btn-small"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

