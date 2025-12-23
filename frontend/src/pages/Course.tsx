import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Course, Lesson, Module, CourseProgress, LessonComment } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import QuizComponent from "../components/Quiz";
import CourseReviews from "../components/CourseReviews";
import CourseTags from "../components/CourseTags";
import LessonAttachments from "../components/LessonAttachments";
import { useToast } from "../context/ToastContext";

type CourseResponse = Course & {
  modules: (Module & { lessons: Lesson[] })[];
};

export default function CoursePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [currentLessonProgress, setCurrentLessonProgress] = useState<boolean>(false);
  const [comments, setComments] = useState<LessonComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<{ id: string; pdfUrl: string } | null>(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCourse(null);
    setCurrentLesson(null);
    setIsEnrolled(false);
    setError(null);
    setLoading(true);
    setCertificate(null);
    setCertificateLoading(false);

    async function fetchCourse() {
      if (!id) {
        setLoading(false);
        return;
      }
      
      try {
        const [courseRes, enrollmentsRes, favoriteCheck] = await Promise.all([
          api.get<CourseResponse>(`/courses/${id}`),
          user?.role === "STUDENT" ? api.get("/enrollments/my") : Promise.resolve({ data: [] }),
          user ? api.get(`/favorites/${id}/check`).catch(() => ({ data: { isFavorite: false } })) : Promise.resolve({ data: { isFavorite: false } }),
        ]);

        setCourse(courseRes.data);
        const firstLesson = courseRes.data.modules?.[0]?.lessons?.[0] ?? null;
        setCurrentLesson(firstLesson || null);
        setIsFavorite(favoriteCheck.data.isFavorite || false);

        let enrolled = false;
        if (user?.role === "STUDENT" && enrollmentsRes.data) {
          enrolled = enrollmentsRes.data.some((e: any) => e.courseId === id);
          setIsEnrolled(enrolled);
        } else if (user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
          enrolled = true;
          setIsEnrolled(true);
        }

        if (enrolled || user?.role === "INSTRUCTOR" || user?.role === "ADMIN") {
          try {
            const [progressRes, certificatesRes] = await Promise.all([
              api.get<CourseProgress>(`/progress/course/${id}`),
              user?.role === "STUDENT" ? api.get("/certificates/my").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
            ]);
            setProgress(progressRes.data);
            
            if (certificatesRes.data && Array.isArray(certificatesRes.data)) {
              const courseCert = certificatesRes.data.find((cert: any) => cert.courseId === id);
              if (courseCert) {
                setCertificate({ id: courseCert.id, pdfUrl: courseCert.pdfUrl });
                showToast("🎉 Certificado gerado com sucesso!", "success");
              }
            }
              } catch (progressErr) {
                console.warn("Erro ao carregar progresso:", progressErr);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "Erro ao carregar curso");
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id, user]);

  useEffect(() => {
    if (!currentLesson || !currentLesson.id || !isEnrolled) {
      setCurrentLessonProgress(false);
      return;
    }

    const lessonId = currentLesson.id;
    async function fetchLessonProgress() {
      try {
        const res = await api.get(`/progress/lesson/${lessonId}`);
        setCurrentLessonProgress(res.data.completed || false);
      } catch (err) {
        setCurrentLessonProgress(false);
      }
    }

    fetchLessonProgress();
  }, [currentLesson?.id, isEnrolled]);

  useEffect(() => {
    if (progress && currentLesson?.id) {
      const lessonProgress = progress.lessons.find((l) => l.lessonId === currentLesson.id);
      setCurrentLessonProgress(lessonProgress?.completed || false);
    }
  }, [currentLesson?.id, progress]);

  useEffect(() => {
    if (!currentLesson || !course || !progress || !isEnrolled) {
      setShowQuiz(false);
      return;
    }

    const module = course.modules?.find((mod) =>
      mod.lessons?.some((lesson) => lesson.id === currentLesson.id)
    );

    if (!module) {
      setShowQuiz(false);
      return;
    }

    const moduleLessons = module.lessons || [];
    const allLessonsCompleted = moduleLessons.every((lesson) => {
      const lessonProgress = progress.lessons.find((l) => l.lessonId === lesson.id);
      return lessonProgress?.completed || false;
    });

    const isLastLesson = moduleLessons[moduleLessons.length - 1]?.id === currentLesson.id;

    if (allLessonsCompleted && isLastLesson) {
      setCurrentModuleId(module.id);
      setShowQuiz(true);
    } else {
      setShowQuiz(false);
    }
  }, [currentLesson, course, progress, isEnrolled]);

  useEffect(() => {
    if (!currentLesson || !currentLesson.id || !isEnrolled) {
      setComments([]);
      return;
    }

    const lessonId = currentLesson.id;
    async function fetchComments() {
      try {
        const res = await api.get<LessonComment[]>(`/comments/lesson/${lessonId}`);
        setComments(res.data);
      } catch (err) {
        console.warn("Erro ao carregar comentários:", err);
        setComments([]);
      }
    }

    fetchComments();
  }, [currentLesson?.id, isEnrolled]);

  const handleToggleFavorite = async () => {
    if (!id) return;
    
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${id}`);
        setIsFavorite(false);
      } else {
        await api.post("/favorites", { courseId: id });
        setIsFavorite(true);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao favoritar curso", "error");
    }
  };

  const handleEnroll = async () => {
    if (!id) return;
    try {
      await api.post("/enrollments", { courseId: id });
      setIsEnrolled(true);
      showToast("Matriculado com sucesso!", "success");
      try {
        const progressRes = await api.get<CourseProgress>(`/progress/course/${id}`);
        setProgress(progressRes.data);
      } catch (progressErr) {
        console.warn("Erro ao carregar progresso:", progressErr);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao se matricular", "error");
    }
  };

  const handleToggleLessonComplete = async () => {
    if (!currentLesson?.id) return;

    try {
      if (currentLessonProgress) {
        await api.post("/progress/incomplete", { lessonId: currentLesson.id });
        setCurrentLessonProgress(false);
      } else {
        await api.post("/progress/complete", { lessonId: currentLesson.id });
          setCurrentLessonProgress(true);
        }

        if (id) {
        const [progressRes, certificatesRes] = await Promise.all([
          api.get<CourseProgress>(`/progress/course/${id}`),
          api.get("/certificates/my").catch(() => ({ data: [] })),
            ]);
            setProgress(progressRes.data);
            
            if (certificatesRes.data && Array.isArray(certificatesRes.data)) {
          const courseCert = certificatesRes.data.find((cert: any) => cert.courseId === id);
          if (courseCert) {
            setCertificate({ id: courseCert.id, pdfUrl: courseCert.pdfUrl });
          } else {
                    setCertificate(null);
                  }
                }
                
                if (progressRes.data.progressPercentage === 100 && !certificate) {
          try {
            const certRes = await api.post("/certificates/generate", { courseId: id });
            if (certRes.data.pdfUrl) {
              const certsRes = await api.get("/certificates/my");
              const courseCert = certsRes.data.find((cert: any) => cert.courseId === id);
              if (courseCert) {
                setCertificate({ id: courseCert.id, pdfUrl: courseCert.pdfUrl });
              }
            }
          } catch (certErr: any) {
            if (certErr.response?.status !== 400 || !certErr.response?.data?.error?.includes("completado")) {
              console.warn("Erro ao gerar certificado:", certErr);
              showToast(
                certErr.response?.data?.error ||
                  "Erro ao gerar certificado. Verifique se todas as aulas foram concluídas.",
                "error"
              );
            }
            try {
              const certsRes = await api.get("/certificates/my");
              const courseCert = certsRes.data.find((cert: any) => cert.courseId === id);
              if (courseCert) {
                setCertificate({ id: courseCert.id, pdfUrl: courseCert.pdfUrl });
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar progresso", "error");
    }
  };

  const handleDownloadCertificate = () => {
    if (certificate) {
      const API_URL = api.defaults.baseURL || "http://localhost:4000";
      window.open(`${API_URL}${certificate.pdfUrl}`, "_blank");
    }
  };

  const handleDeleteCertificate = async () => {
    if (!certificate || !id) return;
    
    if (!confirm("Tem certeza que deseja deletar este certificado? Você poderá gerar um novo depois.")) {
      return;
    }

    try {
      await api.delete(`/certificates/${certificate.id}`);
      setCertificate(null);
      showToast("Certificado deletado com sucesso!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar certificado", "error");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLesson?.id || !newComment.trim()) return;

    try {
      await api.post("/comments", {
        lessonId: currentLesson.id,
        content: newComment.trim(),
      });
      setNewComment("");
      const res = await api.get<LessonComment[]>(`/comments/lesson/${currentLesson.id}`);
      setComments(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao adicionar comentário", "error");
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || !currentLesson?.id) return;

    try {
      await api.post("/comments", {
        lessonId: currentLesson.id,
        content: replyContent.trim(),
        parentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      const res = await api.get<LessonComment[]>(`/comments/lesson/${currentLesson.id}`);
      setComments(res.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao responder comentário", "error");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Tem certeza que deseja deletar este comentário?")) return;

        try {
          await api.delete(`/comments/${commentId}`);
          if (currentLesson?.id) {
        const res = await api.get<LessonComment[]>(`/comments/lesson/${currentLesson.id}`);
        setComments(res.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao deletar comentário", "error");
    }
  };

  const handleEditComment = (comment: LessonComment) => {
      setEditingComment(comment.id);
      setEditContent(comment.content);
      setReplyingTo(null);
    };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await api.put(`/comments/${commentId}`, {
        content: editContent.trim(),
      });
      setEditingComment(null);
      setEditContent("");
      if (currentLesson?.id) {
        const res = await api.get<LessonComment[]>(`/comments/lesson/${currentLesson.id}`);
        setComments(res.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao atualizar comentário", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return `${minutes} min atrás`;
      }
      return `${hours}h atrás`;
    }
    if (days === 1) return "Ontem";
    if (days < 7) return `${days} dias atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  const isInstructor = user?.role === "INSTRUCTOR" || user?.role === "ADMIN";
  const canViewStudents =
    isInstructor && (course?.instructor?.id === user?.id || user?.role === "ADMIN");

  if (loading) return <div className="loading">Carregando curso...</div>;
  if (error || !course) {
    return (
      <div className="course-enroll-prompt">
        <div className="enroll-card">
          <h2>Não foi possível carregar o curso</h2>
          <p className="muted">{error || "Curso não encontrado ou indisponível."}</p>
          <button className="btn-secondary" onClick={() => navigate("/catalog")}>
            Voltar ao catálogo
          </button>
        </div>
      </div>
    );
  }

  if (!isEnrolled && user?.role === "STUDENT") {
    return (
      <div className="course-enroll-prompt">
        <div className="enroll-card">
          <h2>{course.title}</h2>
          <p>{course.description}</p>
          <div className="course-info">
            <span>Dificuldade: {course.difficulty}</span>
            <span>Carga horária: {course.durationHours}h</span>
            {course.category && <span>Categoria: {course.category.name}</span>}
          </div>
          <button onClick={handleEnroll} className="btn-primary">
            Matricular-se neste curso
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="player">
        <div className="player-header">
          <h2>{currentLesson?.title ?? course.title}</h2>
          {canViewStudents && (
            <button
              onClick={() => navigate(`/instructor/courses/${id}/students`)}
              className="btn-secondary"
            >
              Ver Alunos
            </button>
          )}
        </div>
        {currentLesson ? (
          <>
            {!showQuiz && <VideoPlayer videoUrl={currentLesson.videoUrl} />}
            {!showQuiz && currentLesson.description && (
              <div className="lesson-description">
                <h3>Descrição</h3>
                <p>{currentLesson.description}</p>
              </div>
            )}
            {!showQuiz && (
              <LessonAttachments
                lessonId={currentLesson.id}
                canEdit={user?.role === "INSTRUCTOR" || user?.role === "ADMIN"}
              />
            )}
            {!showQuiz && isEnrolled && user?.role === "STUDENT" && (
              <div className="lesson-actions">
                <button
                  onClick={handleToggleLessonComplete}
                  className={`btn-${currentLessonProgress ? "success" : "primary"}`}
                >
                  {currentLessonProgress ? "✓ Aula Concluída" : "Marcar como Concluída"}
                </button>
              </div>
            )}
            {showQuiz && currentModuleId && (
              <div className="quiz-section">
                <QuizComponent
                  moduleId={currentModuleId}
                  onComplete={() => {
                  }}
                />
              </div>
            )}
            {!showQuiz && isEnrolled && (
              <div className="comments-section">
                <h3>Comentários ({comments.length})</h3>
                <form onSubmit={handleSubmitComment} className="comment-form">
                  <textarea
                    ref={commentInputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicione um comentário..."
                    rows={3}
                    className="comment-input"
                  />
                  <button type="submit" className="btn-primary" disabled={!newComment.trim()}>
                    Comentar
                  </button>
                </form>
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="muted">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <div className="comment-header">
                          <div className="comment-author">
                            {comment.user.avatarUrl ? (
                              <img src={comment.user.avatarUrl} alt={comment.user.name} className="comment-avatar" />
                            ) : (
                              <div className="comment-avatar-placeholder">
                                {comment.user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <strong>{comment.user.name}</strong>
                              <span className="comment-date">{formatDate(comment.createdAt)}</span>
                            </div>
                          </div>
                          {comment.user.id === user?.id && (
                            <div className="comment-actions">
                              <button
                                onClick={() => handleEditComment(comment)}
                                className="btn-secondary"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="btn-danger-small"
                              >
                                Deletar
                              </button>
                            </div>
                          )}
                        </div>
                        {editingComment === comment.id ? (
                          <div className="edit-comment-form">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={3}
                              className="comment-input"
                            />
                            <div className="edit-actions">
                              <button
                                onClick={handleCancelEdit}
                                className="btn-secondary"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                className="btn-primary"
                                disabled={!editContent.trim()}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="comment-content">{comment.content}</p>
                            {!replyingTo && editingComment !== comment.id && (
                              <button
                                onClick={() => setReplyingTo(comment.id)}
                                className="btn-link"
                              >
                                Responder
                              </button>
                            )}
                          </>
                        )}
                        {replyingTo === comment.id && (
                          <div className="reply-form">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Escreva uma resposta..."
                              rows={2}
                              className="comment-input"
                            />
                            <div className="reply-actions">
                              <button
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyContent("");
                                }}
                                className="btn-secondary"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                className="btn-primary"
                                disabled={!replyContent.trim()}
                              >
                                Responder
                              </button>
                            </div>
                          </div>
                        )}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="replies-list">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="reply-item">
                                <div className="comment-header">
                                  <div className="comment-author">
                                    {reply.user.avatarUrl ? (
                                      <img src={reply.user.avatarUrl} alt={reply.user.name} className="comment-avatar" />
                                    ) : (
                                      <div className="comment-avatar-placeholder">
                                        {reply.user.name.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <strong>{reply.user.name}</strong>
                                      <span className="comment-date">{formatDate(reply.createdAt)}</span>
                                    </div>
                                  </div>
                                  {reply.user.id === user?.id && (
                                    <div className="comment-actions">
                                      <button
                                        onClick={() => handleEditComment(reply)}
                                        className="btn-secondary"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteComment(reply.id)}
                                        className="btn-danger-small"
                                      >
                                        Deletar
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {editingComment === reply.id ? (
                                  <div className="edit-comment-form">
                                    <textarea
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      rows={3}
                                      className="comment-input"
                                    />
                                    <div className="edit-actions">
                                      <button
                                        onClick={handleCancelEdit}
                                        className="btn-secondary"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleUpdateComment(reply.id)}
                                        className="btn-primary"
                                        disabled={!editContent.trim()}
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="comment-content">{reply.content}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="video-placeholder">
            <p>Selecione uma aula na barra lateral</p>
          </div>
        )}
      </div>
      <aside className="sidebar">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>{course.title}</h3>
          <button
            onClick={handleToggleFavorite}
            className={`btn-icon ${isFavorite ? "favorited" : ""}`}
            title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            style={{ fontSize: "1.5em", padding: "0.25rem 0.5rem" }}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
        </div>
        <p className="muted">{course.description}</p>
        <div className="course-info-sidebar">
          <div className="info-item">
            <strong>Dificuldade:</strong> {course.difficulty}
          </div>
          <div className="info-item">
            <strong>Carga horária:</strong> {course.durationHours}h
          </div>
          {course.category && (
            <div className="info-item">
              <strong>Categoria:</strong> {course.category.name}
            </div>
          )}
          {progress && isEnrolled && (
            <div className="progress-info">
              <div className="progress-header">
                <strong>Progresso do Curso</strong>
                <span>{progress.progressPercentage}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress.progressPercentage}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {progress.completedLessons} de {progress.totalLessons} aulas concluídas
              </p>
              {progress.progressPercentage === 100 && certificate && (
                <div className="certificate-section">
                  <div className="certificate-badge">
                    <span>🏆</span>
                    <div>
                      <strong>Certificado Disponível!</strong>
                      <small>Você completou este curso com sucesso</small>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                    <button
                      onClick={handleDownloadCertificate}
                      className="btn-primary"
                    >
                      📥 Baixar Certificado
                    </button>
                    <button
                      onClick={handleDeleteCertificate}
                      className="btn-secondary"
                      style={{ fontSize: "0.9em" }}
                    >
                      🗑️ Deletar Certificado
                    </button>
                  </div>
                </div>
              )}
              {progress.progressPercentage === 100 && !certificate && (
                <div className="certificate-section">
                  <div className="certificate-badge">
                    <span>🎉</span>
                    <div>
                      <strong>Parabéns! Curso Concluído!</strong>
                      <small>Clique no botão abaixo para gerar seu certificado</small>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!id) return;
                      try {
                        setCertificateLoading(true);
                        const certRes = await api.post("/certificates/generate", { courseId: id });
                        if (certRes.data.pdfUrl) {
                          const certsRes = await api.get("/certificates/my");
                          const courseCert = certsRes.data.find((cert: any) => cert.courseId === id);
                          if (courseCert) {
                            setCertificate({ id: courseCert.id, pdfUrl: courseCert.pdfUrl });
                            showToast("🎉 Certificado gerado com sucesso!", "success");
                          }
                        }
                      } catch (err: any) {
                        showToast(
                          err.response?.data?.error ||
                            "Erro ao gerar certificado. Verifique se todas as aulas foram concluídas.",
                          "error"
                        );
                      } finally {
                        setCertificateLoading(false);
                      }
                    }}
                    className="btn-primary"
                    disabled={certificateLoading}
                  >
                    {certificateLoading ? "Gerando..." : "Gerar Certificado Agora"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="module-list">
          {course.modules?.map((mod) => (
            <div key={mod.id} className="module">
              <h4>{mod.title}</h4>
              <ul>
                {mod.lessons?.map((lesson) => {
                  const lessonProgress = progress?.lessons.find((l) => l.lessonId === lesson.id);
                  const isCompleted = lessonProgress?.completed || false;
                  return (
                    <li
                      key={lesson.id}
                      className={`${lesson.id === currentLesson?.id ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                      onClick={() => setCurrentLesson(lesson)}
                    >
                      {isCompleted && <span className="check-icon">✓</span>}
                      {lesson.title}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        {id && <CourseTags courseId={id} canEdit={user?.role === "INSTRUCTOR" || user?.role === "ADMIN"} />}
      </aside>
      {id && (
        <div className="reviews-section" style={{ marginTop: "2rem", padding: "1rem", maxWidth: "1200px", margin: "2rem auto" }}>
          <CourseReviews courseId={id} />
        </div>
      )}
    </div>
  );
}
