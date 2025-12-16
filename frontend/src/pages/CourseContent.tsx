import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Module, Lesson } from "../types";

type ModuleWithLessons = Module & {
  lessons: Lesson[];
};

export default function CourseContentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const moduleFormRef = useRef<HTMLFormElement>(null);
  const lessonFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Resetar estado quando o ID mudar
    setModules([]);
    setCourseTitle("");
    setError(null);
    setLoading(true);
    setShowModuleForm(false);
    setShowLessonForm(false);
    setSelectedModuleId("");
    setEditingModule(null);
    setEditingLesson(null);

    if (!id) {
      setLoading(false);
      return;
    }
    
    if (user?.role !== "INSTRUCTOR" && user?.role !== "ADMIN") {
      navigate("/catalog");
      return;
    }

    async function fetchData() {
      try {
        const [modulesRes, courseRes] = await Promise.all([
          api.get<ModuleWithLessons[]>(`/modules/course/${id}`),
          api.get(`/courses/${id}`),
        ]);

        setModules(modulesRes.data);
        setCourseTitle(courseRes.data.title);

        // Verificar permissão
        if (courseRes.data.instructor?.id !== user?.id && user?.role !== "ADMIN") {
          navigate("/instructor/courses");
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, user, navigate]);

  const handleCreateModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const order = parseInt(formData.get("order") as string) || modules.length;

    try {
      await api.post("/modules", {
        title,
        description,
        order,
        courseId: id,
      });
      
      // Se chegou aqui sem erro, foi sucesso
      setShowModuleForm(false);
      setEditingModule(null);
      
      // Recarregar módulos (pode dar erro, mas não deve impedir o sucesso da criação)
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
        // Não mostrar erro ao usuário, apenas logar
      }
      
      // Resetar formulário de forma segura
      if (moduleFormRef.current) {
        moduleFormRef.current.reset();
      } else if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err: any) {
      // Só mostrar erro se realmente houver um erro HTTP (status >= 400)
      if (err.response && err.response.status >= 400) {
        alert(err.response?.data?.error || "Erro ao criar módulo");
      } else if (err.request) {
        // Erro de rede (sem resposta do servidor)
        console.error("Erro de rede ao criar módulo:", err);
        alert("Erro ao criar módulo. Verifique sua conexão.");
      } else {
        // Outro tipo de erro
        console.error("Erro ao criar módulo:", err);
        alert("Erro ao criar módulo. Tente novamente.");
      }
    }
  };

  const handleUpdateModule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingModule) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const order = parseInt(formData.get("order") as string) || editingModule.order || 0;

    try {
      await api.put(`/modules/${editingModule.id}`, {
        title,
        description,
        order,
      });
      
      setEditingModule(null);
      setShowModuleForm(false);
      alert("Módulo atualizado com sucesso!");
      
      // Recarregar módulos
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao atualizar módulo");
    }
  };

  const handleEditModule = (module: ModuleWithLessons) => {
    setEditingModule(module);
    setShowModuleForm(false); // Garantir que o formulário de criação não apareça
  };

  const handleCreateLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedModuleId) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const videoUrl = formData.get("videoUrl") as string;
    const durationMinutes = parseInt(formData.get("durationMinutes") as string) || 0;
    const order = parseInt(formData.get("order") as string) || 0;

    try {
      await api.post("/lessons", {
        title,
        description,
        videoUrl,
        durationMinutes,
        order,
        moduleId: selectedModuleId,
      });
      
      // Se chegou aqui sem erro, foi sucesso
      setShowLessonForm(false);
      setSelectedModuleId("");
      setEditingLesson(null);
      alert("Aula criada com sucesso!");
      
      // Recarregar módulos (pode dar erro, mas não deve impedir o sucesso da criação)
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
        // Não mostrar erro ao usuário, apenas logar
      }
      
      // Resetar formulário de forma segura
      if (lessonFormRef.current) {
        lessonFormRef.current.reset();
      } else if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err: any) {
      // Só mostrar erro se realmente houver um erro HTTP (status >= 400)
      if (err.response && err.response.status >= 400) {
        alert(err.response?.data?.error || "Erro ao criar aula");
      } else if (err.request) {
        // Erro de rede (sem resposta do servidor)
        console.error("Erro de rede ao criar aula:", err);
        alert("Erro ao criar aula. Verifique sua conexão.");
      } else {
        // Outro tipo de erro
        console.error("Erro ao criar aula:", err);
        alert("Erro ao criar aula. Tente novamente.");
      }
    }
  };

  const handleUpdateLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLesson) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const videoUrl = formData.get("videoUrl") as string;
    const durationMinutes = parseInt(formData.get("durationMinutes") as string) || 0;
    const order = parseInt(formData.get("order") as string) || 0;

    try {
      await api.put(`/lessons/${editingLesson.id}`, {
        title,
        description,
        videoUrl,
        durationMinutes,
        order,
      });
      
      setEditingLesson(null);
      setShowLessonForm(false);
      setSelectedModuleId("");
      alert("Aula atualizada com sucesso!");
      
      // Recarregar módulos
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao atualizar aula");
    }
  };

  const handleEditLesson = (lesson: Lesson, moduleId: string) => {
    setEditingLesson(lesson);
    setSelectedModuleId(moduleId);
    setShowLessonForm(false); // Garantir que o formulário de criação não apareça
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Tem certeza que deseja deletar este módulo? Todas as aulas serão deletadas.")) return;

    try {
      await api.delete(`/modules/${moduleId}`);
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao deletar módulo");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta aula?")) return;

    try {
      await api.delete(`/lessons/${lessonId}`);
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao deletar aula");
    }
  };

  if (loading) return <div className="loading">Carregando...</div>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="course-content-page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Voltar
          </button>
          <h2>Conteúdo do Curso</h2>
          <p className="muted">{courseTitle}</p>
        </div>
        <button 
          onClick={() => {
            if (showModuleForm || editingModule) {
              setShowModuleForm(false);
              setEditingModule(null);
            } else {
              setShowModuleForm(true);
              setEditingModule(null);
            }
          }} 
          className="btn-primary"
        >
          {(showModuleForm || editingModule) ? "Cancelar" : "+ Novo Módulo"}
        </button>
      </div>

      {showModuleForm && !editingModule && (
        <div className="form-card">
          <h3>Criar Módulo</h3>
          <form 
            ref={moduleFormRef} 
            onSubmit={handleCreateModule}
          >
            <div className="form-group">
              <label>Título *</label>
              <input 
                name="title" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea 
                name="description" 
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Ordem</label>
              <input 
                name="order" 
                type="number" 
                defaultValue={modules.length} 
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => {
                  setShowModuleForm(false);
                }} 
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      {showLessonForm && !editingLesson && (
        <div className="form-card">
          <h3>Adicionar Aula</h3>
          <form 
            ref={lessonFormRef} 
            onSubmit={handleCreateLesson}
          >
            <div className="form-group">
              <label>Título *</label>
              <input 
                name="title" 
                required 
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea 
                name="description" 
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>URL do Vídeo (YouTube/Vimeo)</label>
              <input 
                name="videoUrl" 
                type="url" 
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Duração (minutos)</label>
                <input 
                  name="durationMinutes" 
                  type="number" 
                  min="0" 
                  defaultValue={0} 
                />
              </div>
              <div className="form-group">
                <label>Ordem</label>
                <input 
                  name="order" 
                  type="number" 
                  min="0" 
                  defaultValue={0} 
                />
              </div>
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => { 
                  setShowLessonForm(false); 
                  setSelectedModuleId("");
                }} 
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="modules-list">
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum módulo criado ainda. Crie o primeiro módulo!</p>
          </div>
        ) : (
          modules.map((module) => (
            <div key={module.id} className="module-card">
              {editingModule?.id === module.id ? (
                <div className="form-card inline-form">
                  <h3>Editar Módulo</h3>
                  <form 
                    onSubmit={handleUpdateModule}
                  >
                    <div className="form-group">
                      <label>Título *</label>
                      <input 
                        name="title" 
                        required 
                        defaultValue={editingModule.title}
                      />
                    </div>
                    <div className="form-group">
                      <label>Descrição</label>
                      <textarea 
                        name="description" 
                        rows={3}
                        defaultValue={editingModule.description || ""}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ordem</label>
                      <input 
                        name="order" 
                        type="number" 
                        defaultValue={editingModule.order ?? 0} 
                      />
                    </div>
                    <div className="form-actions">
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingModule(null);
                          setShowModuleForm(false);
                        }} 
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                      <button type="submit" className="btn-primary">
                        Salvar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  <div className="module-header">
                    <div>
                      <h3>{module.title}</h3>
                      {module.description && <p className="muted">{module.description}</p>}
                    </div>
                    <div className="module-actions">
                      <button
                        onClick={() => {
                          setSelectedModuleId(module.id);
                          setEditingLesson(null);
                          setShowLessonForm(true);
                        }}
                        className="btn-secondary"
                      >
                        + Aula
                      </button>
                      <button
                        onClick={() => handleEditModule(module)}
                        className="btn-secondary"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className="btn-danger"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                  <div className="lessons-list">
                    {module.lessons?.length === 0 ? (
                      <p className="muted">Nenhuma aula ainda</p>
                    ) : (
                      module.lessons?.map((lesson) => (
                        <div key={lesson.id} className="lesson-item">
                          {editingLesson?.id === lesson.id ? (
                            <div className="form-card inline-form lesson-form">
                              <h4>Editar Aula</h4>
                              <form 
                                onSubmit={handleUpdateLesson}
                              >
                                <div className="form-group">
                                  <label>Título *</label>
                                  <input 
                                    name="title" 
                                    required 
                                    defaultValue={editingLesson.title}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>Descrição</label>
                                  <textarea 
                                    name="description" 
                                    rows={3}
                                    defaultValue={editingLesson.description || ""}
                                  />
                                </div>
                                <div className="form-group">
                                  <label>URL do Vídeo (YouTube/Vimeo)</label>
                                  <input 
                                    name="videoUrl" 
                                    type="url" 
                                    placeholder="https://youtube.com/watch?v=..."
                                    defaultValue={editingLesson.videoUrl || ""}
                                  />
                                </div>
                                <div className="form-row">
                                  <div className="form-group">
                                    <label>Duração (minutos)</label>
                                    <input 
                                      name="durationMinutes" 
                                      type="number" 
                                      min="0" 
                                      defaultValue={editingLesson.durationMinutes || 0} 
                                    />
                                  </div>
                                  <div className="form-group">
                                    <label>Ordem</label>
                                    <input 
                                      name="order" 
                                      type="number" 
                                      min="0" 
                                      defaultValue={editingLesson.order || 0} 
                                    />
                                  </div>
                                </div>
                                <div className="form-actions">
                                  <button 
                                    type="button" 
                                    onClick={() => { 
                                      setEditingLesson(null);
                                      setShowLessonForm(false);
                                      setSelectedModuleId("");
                                    }} 
                                    className="btn-secondary"
                                  >
                                    Cancelar
                                  </button>
                                  <button type="submit" className="btn-primary">
                                    Salvar
                                  </button>
                                </div>
                              </form>
                            </div>
                          ) : (
                            <>
                              <div className="lesson-info">
                                <strong>{lesson.title}</strong>
                                {lesson.description && <p className="muted">{lesson.description}</p>}
                                <div className="lesson-meta">
                                  {lesson.videoUrl && <span>📹 Vídeo</span>}
                                  {lesson.durationMinutes && <span>{lesson.durationMinutes} min</span>}
                                </div>
                              </div>
                              <div className="lesson-actions">
                                <button
                                  onClick={() => handleEditLesson(lesson, module.id)}
                                  className="btn-secondary"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="btn-danger-small"
                                >
                                  Deletar
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

