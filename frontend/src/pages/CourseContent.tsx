import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Module, Lesson, Quiz, QuizQuestion } from "../types";

type ModuleWithLessons = Module & {
  lessons: Lesson[];
  quiz?: Quiz | null;
};

const parseOptions = (options: any): string[] => {
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try {
      return JSON.parse(options);
    } catch {
      return [];
    }
  }
  return [];
};

export default function CourseContentPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [selectedQuizModuleId, setSelectedQuizModuleId] = useState<string>("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const moduleFormRef = useRef<HTMLFormElement>(null);
  const lessonFormRef = useRef<HTMLFormElement>(null);
  const quizFormRef = useRef<HTMLFormElement>(null);
  const questionFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
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
      
      setShowModuleForm(false);
      setEditingModule(null);
      
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
      
      if (moduleFormRef.current) {
        moduleFormRef.current.reset();
      } else if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err: any) {
      if (err.response && err.response.status >= 400) {
        showToast(err.response?.data?.error || "Erro ao criar módulo", "error");
      } else if (err.request) {
        console.error("Erro de rede ao criar módulo:", err);
        showToast("Erro ao criar módulo. Verifique sua conexão.", "error");
      } else {
        console.error("Erro ao criar módulo:", err);
        showToast("Erro ao criar módulo. Tente novamente.", "error");
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
      showToast("Módulo atualizado com sucesso!", "success");
      
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar módulo", "error");
    }
  };

  const handleEditModule = (module: ModuleWithLessons) => {
    setEditingModule(module);
    setShowModuleForm(false);
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
      
      setShowLessonForm(false);
      setSelectedModuleId("");
      setEditingLesson(null);
      showToast("Aula criada com sucesso!", "success");
      
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
      
      if (lessonFormRef.current) {
        lessonFormRef.current.reset();
      } else if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err: any) {
      if (err.response && err.response.status >= 400) {
        showToast(err.response?.data?.error || "Erro ao criar aula", "error");
      } else if (err.request) {
        console.error("Erro de rede ao criar aula:", err);
        showToast("Erro ao criar aula. Verifique sua conexão.", "error");
      } else {
        console.error("Erro ao criar aula:", err);
        showToast("Erro ao criar aula. Tente novamente.", "error");
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
      showToast("Aula atualizada com sucesso!", "success");
      
      try {
        const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
        setModules(data);
      } catch (reloadErr: any) {
        console.warn("Erro ao recarregar módulos:", reloadErr);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar aula", "error");
    }
  };

  const handleEditLesson = (lesson: Lesson, moduleId: string) => {
    setEditingLesson(lesson);
    setSelectedModuleId(moduleId);
    setShowLessonForm(false);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Tem certeza que deseja deletar este módulo? Todas as aulas serão deletadas.")) return;

    try {
      await api.delete(`/modules/${moduleId}`);
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar módulo", "error");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta aula?")) return;

    try {
      await api.delete(`/lessons/${lessonId}`);
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar aula", "error");
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedQuizModuleId) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const passingScore = parseInt(formData.get("passingScore") as string) || 70;

    try {
      await api.post("/quizzes", {
        moduleId: selectedQuizModuleId,
        title,
        description,
        passingScore,
      });
      const quizRes = await api.get<Quiz>(`/quizzes/module/${selectedQuizModuleId}`);
      const quizData = {
        ...quizRes.data,
        questions: quizRes.data.questions.map((q: any) => ({
          ...q,
          options: parseOptions(q.options),
        })),
      };
      setEditingQuiz(quizData);
      showToast("Quiz criado com sucesso! Agora adicione questões.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao criar quiz", "error");
    }
  };

  const handleEditQuiz = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingQuiz) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const passingScore = parseInt(formData.get("passingScore") as string) || 70;

    try {
      await api.put(`/quizzes/${editingQuiz.id}`, {
        title,
        description,
        passingScore,
      });
      const quizRes = await api.get<Quiz>(`/quizzes/module/${editingQuiz.moduleId}`);
      const quizData = {
        ...quizRes.data,
        questions: quizRes.data.questions.map((q: any) => ({
          ...q,
          options: parseOptions(q.options),
        })),
      };
      setEditingQuiz(quizData);
      showToast("Quiz atualizado com sucesso!", "success");
      setShowQuizForm(false);
      setEditingQuiz(null);
      setSelectedQuizModuleId("");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar quiz", "error");
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Tem certeza que deseja deletar este quiz? Todas as questões serão deletadas.")) return;

    try {
      await api.delete(`/quizzes/${quizId}`);
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
      showToast("Quiz deletado com sucesso!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar quiz", "error");
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedQuizId) return;

    const formData = new FormData(e.currentTarget);
    const question = formData.get("question") as string;
    const option1 = formData.get("option1") as string;
    const option2 = formData.get("option2") as string;
    const option3 = formData.get("option3") as string;
    const option4 = formData.get("option4") as string;
    const correctAnswer = parseInt(formData.get("correctAnswer") as string);
    const order = parseInt(formData.get("order") as string) || 0;

    const options = [option1, option2, option3, option4].filter((opt) => opt.trim());

    if (options.length < 2) {
      showToast("É necessário pelo menos 2 opções", "error");
      return;
    }

    try {
      await api.post("/quizzes/questions", {
        quizId: selectedQuizId,
        question,
        options,
        correctAnswer,
        order,
      });
      showToast("Questão criada com sucesso!", "success");
      if (editingQuiz) {
        const quizRes = await api.get<Quiz>(`/quizzes/module/${editingQuiz.moduleId}`);
        const quizData = {
          ...quizRes.data,
          questions: quizRes.data.questions.map((q: any) => ({
            ...q,
            options: parseOptions(q.options),
          })),
        };
        setEditingQuiz(quizData);
      }
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
      setShowQuestionForm(false);
      setSelectedQuizId("");
      setEditingQuestion(null);
      if (questionFormRef.current) {
        questionFormRef.current.reset();
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao criar questão", "error");
    }
  };

  const handleEditQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingQuestion) return;

    const formData = new FormData(e.currentTarget);
    const question = formData.get("question") as string;
    const option1 = formData.get("option1") as string;
    const option2 = formData.get("option2") as string;
    const option3 = formData.get("option3") as string;
    const option4 = formData.get("option4") as string;
    const correctAnswer = parseInt(formData.get("correctAnswer") as string);
    const order = parseInt(formData.get("order") as string) || 0;

    const options = [option1, option2, option3, option4].filter((opt) => opt.trim());

    if (options.length < 2) {
      showToast("É necessário pelo menos 2 opções", "error");
      return;
    }

    try {
      await api.put(`/quizzes/questions/${editingQuestion.id}`, {
        question,
        options,
        correctAnswer,
        order,
      });
      showToast("Questão atualizada com sucesso!", "success");
      if (editingQuiz) {
        const quizRes = await api.get<Quiz>(`/quizzes/module/${editingQuiz.moduleId}`);
        const quizData = {
          ...quizRes.data,
          questions: quizRes.data.questions.map((q: any) => ({
            ...q,
            options: parseOptions(q.options),
          })),
        };
        setEditingQuiz(quizData);
      }
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setSelectedQuizId("");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar questão", "error");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta questão?")) return;

    try {
      await api.delete(`/quizzes/questions/${questionId}`);
      if (editingQuiz) {
        const quizRes = await api.get<Quiz>(`/quizzes/module/${editingQuiz.moduleId}`);
        const quizData = {
          ...quizRes.data,
          questions: quizRes.data.questions.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]"),
          })),
        };
        setEditingQuiz(quizData);
      }
      const { data } = await api.get<ModuleWithLessons[]>(`/modules/course/${id}`);
      setModules(data);
      showToast("Questão deletada com sucesso!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar questão", "error");
    }
  };

  const handleManageQuiz = async (moduleId: string) => {
    try {
      const res = await api.get<Quiz>(`/quizzes/module/${moduleId}`);
      const quizData = {
        ...res.data,
        questions: res.data.questions.map((q: any) => ({
          ...q,
          options: parseOptions(q.options),
        })),
      };
      setEditingQuiz(quizData);
      setSelectedQuizModuleId(moduleId);
      setShowQuizForm(true);
      setShowQuestionForm(false);
      setEditingQuestion(null);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setEditingQuiz(null);
        setSelectedQuizModuleId(moduleId);
        setShowQuizForm(true);
        setShowQuestionForm(false);
        setEditingQuestion(null);
      } else {
        showToast(err.response?.data?.error || "Erro ao carregar quiz", "error");
      }
    }
  };

  if (loading) return <div className="loading">Carregando conteúdo do curso...</div>;
  if (error) {
    return (
      <div className="course-content-page">
        <div className="enroll-card">
          <h2>Não foi possível carregar o conteúdo</h2>
          <p className="muted">{error}</p>
          <button className="btn-secondary" onClick={() => navigate("/instructor/courses")}>
            Voltar para Meus Cursos
          </button>
        </div>
      </div>
    );
  }

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

      {showQuizForm && (
        <div className="form-card">
          <h3>{editingQuiz ? "Editar Quiz" : "Criar Quiz"}</h3>
          <form 
            ref={quizFormRef} 
            onSubmit={editingQuiz ? handleEditQuiz : handleCreateQuiz}
          >
            <div className="form-group">
              <label>Título *</label>
              <input 
                name="title" 
                required 
                defaultValue={editingQuiz?.title || ""}
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <textarea 
                name="description" 
                rows={3}
                defaultValue={editingQuiz?.description || ""}
              />
            </div>
            <div className="form-group">
              <label>Nota Mínima para Aprovação (%)</label>
              <input 
                name="passingScore" 
                type="number" 
                min="0" 
                max="100" 
                defaultValue={editingQuiz?.passingScore || 70} 
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => { 
                  setShowQuizForm(false); 
                  setEditingQuiz(null);
                  setSelectedQuizModuleId("");
                  setShowQuestionForm(false);
                  setEditingQuestion(null);
                }} 
                className="btn-secondary"
              >
                {editingQuiz ? "Fechar" : "Cancelar"}
              </button>
              {editingQuiz && (
                <button
                  type="button"
                  onClick={() => handleDeleteQuiz(editingQuiz.id)}
                  className="btn-danger"
                >
                  Deletar Quiz
                </button>
              )}
              <button type="submit" className="btn-primary">
                {editingQuiz ? "Salvar" : "Criar"}
              </button>
            </div>
          </form>
          {editingQuiz && !showQuestionForm && (
            <div className="quiz-questions-management">
              <div className="quiz-questions-header">
                <h4>
                  Questões do Quiz 
                  {editingQuiz.questions && editingQuiz.questions.length > 0 && (
                    <span className="question-count">({editingQuiz.questions.length})</span>
                  )}
                </h4>
                <button
                  onClick={() => {
                    setSelectedQuizId(editingQuiz.id);
                    setEditingQuestion(null);
                    setShowQuestionForm(true);
                  }}
                  className="btn-primary"
                >
                  + Adicionar Questão
                </button>
              </div>
              {editingQuiz.questions && editingQuiz.questions.length > 0 ? (
                <div className="questions-list">
                  {editingQuiz.questions.map((question, index) => (
                    <div key={question.id} className="question-item">
                      <div className="question-header">
                        <div className="question-number">{index + 1}</div>
                        <div className="question-content">
                          <strong>{question.question}</strong>
                          <div className="question-options-preview">
                            {parseOptions(question.options).map((option: string, optIndex: number) => (
                              <div
                                key={optIndex}
                                className={`question-option-preview ${optIndex === question.correctAnswer ? "correct" : ""}`}
                              >
                                {String.fromCharCode(65 + optIndex)}. {option}
                                {optIndex === question.correctAnswer && " ✓"}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="question-actions">
                          <button
                            onClick={() => {
                              const questionToEdit = {
                                ...question,
                                options: parseOptions(question.options),
                              };
                              setEditingQuestion(questionToEdit);
                              setSelectedQuizId(editingQuiz.id);
                              setShowQuestionForm(true);
                            }}
                            className="btn-secondary"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="btn-danger-small"
                          >
                            Deletar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-questions">
                  <p className="muted">Nenhuma questão ainda.</p>
                  <p className="muted">Clique em "Adicionar Questão" para começar!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showQuestionForm && (
        <div className="form-card">
          <h3>{editingQuestion ? "Editar Questão" : "Adicionar Questão"}</h3>
          <form 
            ref={questionFormRef} 
            onSubmit={editingQuestion ? handleEditQuestion : handleCreateQuestion}
          >
            <div className="form-group">
              <label>Pergunta *</label>
              <textarea 
                name="question" 
                required 
                rows={2}
                defaultValue={editingQuestion?.question || ""}
              />
            </div>
            <div className="form-group">
              <label>Opção 1 *</label>
              <input 
                name="option1" 
                required 
                defaultValue={editingQuestion ? parseOptions(editingQuestion.options)[0] || "" : ""}
              />
            </div>
            <div className="form-group">
              <label>Opção 2 *</label>
              <input 
                name="option2" 
                required 
                defaultValue={editingQuestion ? parseOptions(editingQuestion.options)[1] || "" : ""}
              />
            </div>
            <div className="form-group">
              <label>Opção 3</label>
              <input 
                name="option3" 
                defaultValue={editingQuestion ? parseOptions(editingQuestion.options)[2] || "" : ""}
              />
            </div>
            <div className="form-group">
              <label>Opção 4</label>
              <input 
                name="option4" 
                defaultValue={editingQuestion ? parseOptions(editingQuestion.options)[3] || "" : ""}
              />
            </div>
            <div className="form-group">
              <label>Resposta Correta *</label>
              <select 
                name="correctAnswer" 
                required 
                defaultValue={editingQuestion?.correctAnswer ?? 0}
                className="correct-answer-select"
              >
                <option value="0">Opção 1 (A)</option>
                <option value="1">Opção 2 (B)</option>
                <option value="2">Opção 3 (C)</option>
                <option value="3">Opção 4 (D)</option>
              </select>
              <small className="form-hint">Selecione qual opção é a resposta correta</small>
            </div>
            <div className="form-group">
              <label>Ordem</label>
              <input 
                name="order" 
                type="number" 
                min="0" 
                defaultValue={editingQuestion?.order || 0} 
              />
            </div>
            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => { 
                  setShowQuestionForm(false); 
                  setEditingQuestion(null);
                  setSelectedQuizId("");
                }} 
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                {editingQuestion ? "Salvar" : "Criar"}
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
                  <form onSubmit={handleUpdateModule}>
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
                        onClick={() => handleManageQuiz(module.id)}
                        className="btn-secondary"
                      >
                        📝 Quiz
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
                      module.lessons?.map((lesson) => {
                        const isEditingThisLesson = editingLesson?.id === lesson.id;
                        return (
                          <div
                            key={lesson.id}
                            className={`lesson-item${isEditingThisLesson ? " editing" : ""}`}
                          >
                            {isEditingThisLesson ? (
                            <div className="form-card inline-form lesson-form">
                              <h4>Editar Aula</h4>
                              <form onSubmit={handleUpdateLesson}>
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
                        );
                      })
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

