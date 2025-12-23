import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Note } from "../types";
import { useToast } from "../context/ToastContext";

interface LessonNotesProps {
  lessonId: string;
}

export default function LessonNotes({ lessonId }: LessonNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (lessonId) {
      fetchNotes();
    }
  }, [lessonId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const res = await api.get<Note[]>(`/notes/lesson/${lessonId}`);
      setNotes(res.data);
    } catch (err: any) {
      console.error("Erro ao carregar anotações:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast("Por favor, digite uma anotação", "error");
      return;
    }

    try {
      if (editingNote) {
        await api.put(`/notes/${editingNote.id}`, { content });
      } else {
        await api.post("/notes", { lessonId, content });
      }
      setContent("");
      setShowForm(false);
      setEditingNote(null);
      fetchNotes();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao salvar anotação", "error");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Deseja deletar esta anotação?")) return;

    try {
      await api.delete(`/notes/${noteId}`);
      fetchNotes();
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar anotação", "error");
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setContent(note.content);
    setShowForm(true);
  };

  if (loading) return <div className="loading">Carregando anotações...</div>;

  return (
    <div className="lesson-notes">
      <div className="notes-header">
        <h4>Minhas Anotações</h4>
        <button onClick={() => { setShowForm(!showForm); setEditingNote(null); setContent(""); }} className="btn-secondary-small">
          {showForm ? "Cancelar" : "+ Nova Anotação"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmitNote} className="note-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Digite sua anotação sobre esta aula..."
            required
          />
          <div className="form-actions">
            <button type="submit" className="btn-primary-small">
              {editingNote ? "Atualizar" : "Salvar"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingNote(null); setContent(""); }} className="btn-secondary-small">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="notes-list">
        {notes.length === 0 ? (
          <p className="muted">Nenhuma anotação ainda. Adicione uma anotação para não esquecer pontos importantes!</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="note-item">
              <div className="note-header">
                <small>{new Date(note.updatedAt || note.createdAt).toLocaleString("pt-BR")}</small>
                <div>
                  <button onClick={() => handleEditNote(note)} className="btn-icon-small" title="Editar">
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteNote(note.id)} className="btn-icon-small" title="Deletar">
                    🗑️
                  </button>
                </div>
              </div>
              <p className="note-content">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

