import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { API_URL, api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import type { Course, Lesson, Module, CourseProgress, LessonComment, MyEnrollment } from "../types";
import VideoPlayer, { type VideoProgressReport } from "../components/VideoPlayer";
import { resumePosition } from "../utils/video";
import QuizComponent from "../components/Quiz";
import CourseReviews from "../components/CourseReviews";
import CourseTags from "../components/CourseTags";
import LessonAttachments from "../components/LessonAttachments";
import { useToast } from "../context/useToast";

type CourseModule = Module & { lessons: Lesson[]; quiz?: { id: string } | null };

type CourseResponse = Omit<Course, "modules"> & {
  modules: CourseModule[];
};

type CertificateSummary = { id: string; courseId: string; pdfUrl: string; verificationCode: string };
type CourseCertificate = Pick<CertificateSummary, "id" | "pdfUrl" | "verificationCode">;

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
  const [certificate, setCertificate] = useState<CourseCertificate | null>(null);
  const [certificateLoading, setCertificateLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  // Onde retomar o vídeo da aula atual (carregado antes de montar o player).
  const [videoStart, setVideoStart] = useState<{ lessonId: string; seconds: number } | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const isOwner =
    !!user && !!course && (user.role === "ADMIN" || course.instructor?.id === user.id);
  // Aluno matriculado (inclui instrutores matriculados em cursos de outros instrutores).
  const isLearner = isEnrolled && !isOwner;

  const findCourseCertificate = useCallback(async (): Promise<CertificateSummary | null> => {
    const res = await api.get<CertificateSummary[]>("/certificates/my");
    return res.data.find((cert) => cert.courseId === id) ?? null;
  }, [id]);

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
          user ? api.get<MyEnrollment[]>("/enrollments/my") : Promise.resolve({ data: [] as MyEnrollment[] }),
          user ? api.get(`/favorites/${id}/check`).catch(() => ({ data: { isFavorite: false } })) : Promise.resolve({ data: { isFavorite: false } }),
        ]);

        setCourse(courseRes.data);
        const firstLesson = courseRes.data.modules?.[0]?.lessons?.[0] ?? null;
        setCurrentLesson(firstLesson || null);
        setIsFavorite(favoriteCheck.data.isFavorite || false);

        const owner =
          user?.role === "ADMIN" || courseRes.data.instructor?.id === user?.id;
        const enrolledAsStudent = Array.isArray(enrollmentsRes.data)
          ? enrollmentsRes.data.some((e) => e.courseId === id)
          : false;
        setIsEnrolled(owner || enrolledAsStudent);

        if (enrolledAsStudent && !owner) {
          try {
            const [progressRes, courseCert] = await Promise.all([
              api.get<CourseProgress>(`/progress/course/${id}`),
              findCourseCertificate().catch(() => null),
            ]);
            setProgress(progressRes.data);
            if (courseCert) {
              setCertificate(courseCert);
            }
          } catch (progressErr) {
            console.warn("Erro ao carregar progresso:", progressErr);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, "Erro ao carregar curso"));
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [id, user, findCourseCertificate]);

  const currentLessonId = currentLesson?.id;

  useEffect(() => {
    const lessonProgress = progress?.lessons.find((l) => l.lessonId === currentLessonId);
    setCurrentLessonProgress(lessonProgress?.completed || false);
  }, [currentLessonId, progress]);

  useEffect(() => {
    if (!currentLesson || !course || !progress || !isEnrolled) {
      setShowQuiz(false);
      return;
    }

    const module = course.modules?.find((mod) =>
      mod.lessons?.some((lesson) => lesson.id === currentLesson.id)
    );

    // Só exibe o quiz quando o módulo realmente tem um.
    if (!module || !module.quiz) {
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
    if (!currentLessonId || !isLearner) return;
    const lessonId = currentLessonId;
    let cancelled = false;
    api
      .get<{ lastPositionSeconds: number; videoDurationSeconds: number | null } | null>(`/progress/lesson/${lessonId}`)
      .then((res) => resumePosition(res.data?.lastPositionSeconds, res.data?.videoDurationSeconds))
      .catch(() => 0)
      .then((seconds) => {
        if (!cancelled) setVideoStart({ lessonId, seconds });
      });
    return () => {
      cancelled = true;
    };
  }, [currentLessonId, isLearner]);

  /** Atualiza progresso e certificado depois que uma aula foi concluída automaticamente. */
  const handleLessonAutoCompleted = useCallback(
    async (lessonId: string) => {
      if (lessonId === currentLessonId) setCurrentLessonProgress(true);
      showToast("✓ Aula concluída: você assistiu ao vídeo.", "success");
      if (!id) return;
      try {
        const [progressRes, courseCert] = await Promise.all([
          api.get<CourseProgress>(`/progress/course/${id}`),
          findCourseCertificate().catch(() => null),
        ]);
        setProgress(progressRes.data);
        if (courseCert && !certificate) {
          setCertificate(courseCert);
          showToast("🎉 Certificado gerado com sucesso!", "success");
        }
      } catch (err) {
        console.warn("Erro ao atualizar progresso:", err);
      }
    },
    [certificate, currentLessonId, findCourseCertificate, id, showToast]
  );

  const handleVideoProgress = useCallback(
    (lessonId: string, report: VideoProgressReport) => {
      const { final, ...data } = report;
      const body = { lessonId, ...data };
      const onResult = (result: { autoCompleted?: boolean } | null) => {
        if (result?.autoCompleted) handleLessonAutoCompleted(lessonId);
      };
      if (final) {
        // A página pode estar fechando: keepalive garante que o envio termine.
        fetch(`${API_URL}/progress/video`, {
          method: "POST",
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify(body),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then(onResult)
          .catch(() => undefined);
        return;
      }
      api
        .post<{ autoCompleted?: boolean }>("/progress/video", body)
        .then((res) => onResult(res.data))
        .catch((err) => console.warn("Erro ao registrar progresso do vídeo:", err));
    },
    [handleLessonAutoCompleted]
  );

  useEffect(() => {
    if (!currentLessonId || !isEnrolled) {
      setComments([]);
      return;
    }

    const lessonId = currentLessonId;
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
  }, [currentLessonId, isEnrolled]);

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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao favoritar curso"), "error");
    }
  };

  const handleEnroll = async () => {
    if (!id) return;
    try {
      await api.post("/enrollments", { courseId: id });
      showToast("Matriculado com sucesso!", "success");
      try {
        // Recarrega o curso: antes da matrícula a API não envia os links dos vídeos.
        const [courseRes, progressRes] = await Promise.all([
          api.get<CourseResponse>(`/courses/${id}`),
          api.get<CourseProgress>(`/progress/course/${id}`),
        ]);
        setCourse(courseRes.data);
        setCurrentLesson(courseRes.data.modules?.[0]?.lessons?.[0] ?? null);
        setProgress(progressRes.data);
      } catch (progressErr) {
        console.warn("Erro ao carregar progresso:", progressErr);
      }
      setIsEnrolled(true);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao se matricular"), "error");
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
        const [progressRes, existingCert] = await Promise.all([
          api.get<CourseProgress>(`/progress/course/${id}`),
          findCourseCertificate().catch(() => null),
        ]);
        setProgress(progressRes.data);

        // O backend gera o certificado automaticamente ao concluir a última aula;
        // só pede a geração manual se, por algum motivo, ele ainda não existir.
        let courseCert = existingCert;
        if (!courseCert && progressRes.data.progressPercentage === 100) {
          try {
            const certRes = await api.post<CourseCertificate>("/certificates/generate", { courseId: id });
            courseCert = { ...certRes.data, courseId: id };
          } catch (certErr) {
            console.warn("Erro ao gerar certificado:", certErr);
            showToast(
              getErrorMessage(certErr, "Erro ao gerar certificado. Verifique se todas as aulas foram concluídas."),
              "error"
            );
          }
        }

        if (courseCert && !certificate) {
          showToast("🎉 Certificado gerado com sucesso!", "success");
        }
        setCertificate(courseCert);
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar progresso"), "error");
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certificate) return;
    try {
      // O download exige autenticação, então é feito via API (com token) e aberto como blob.
      const res = await api.get(`/certificates/${certificate.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificado_${course?.title.replace(/\s+/g, "_") || "curso"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      showToast("Erro ao baixar certificado", "error");
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao deletar certificado"), "error");
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao adicionar comentário"), "error");
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao responder comentário"), "error");
    }
  };

  const handleDeleteComment = async (commentId: string, replyCount = 0) => {
    const message =
      replyCount > 0
        ? `Tem certeza que deseja deletar este comentário? As ${replyCount} resposta(s) dele também serão removidas.`
        : "Tem certeza que deseja deletar este comentário?";
    if (!confirm(message)) return;

        try {
          await api.delete(`/comments/${commentId}`);
          if (currentLesson?.id) {
        const res = await api.get<LessonComment[]>(`/comments/lesson/${currentLesson.id}`);
        setComments(res.data);
      }
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao deletar comentário"), "error");
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
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao atualizar comentário"), "error");
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

  const canViewStudents = isOwner;
  const canModerateComments = user?.role === "ADMIN";

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

  if (!isEnrolled) {
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
            {!isLearner ? (
              <VideoPlayer key={currentLesson.id} videoUrl={currentLesson.videoUrl} />
            ) : videoStart?.lessonId === currentLesson.id ? (
              <VideoPlayer
                key={currentLesson.id}
                videoUrl={currentLesson.videoUrl}
                startAt={videoStart.seconds}
                onProgress={(report) => handleVideoProgress(currentLesson.id, report)}
              />
            ) : (
              <div className="video-placeholder">
                <p>Carregando vídeo...</p>
              </div>
            )}
            {currentLesson.description && (
              <div className="lesson-description">
                <h3>Descrição</h3>
                <p>{currentLesson.description}</p>
              </div>
            )}
            <LessonAttachments lessonId={currentLesson.id} canEdit={isOwner} />
            {isLearner && (
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
                  key={currentModuleId}
                  moduleId={currentModuleId}
                  onComplete={async (attempt) => {
                    // A aprovação pode ter sido o último requisito do certificado.
                    if (!attempt.passed || !id) return;
                    const [progressRes, courseCert] = await Promise.all([
                      api.get<CourseProgress>(`/progress/course/${id}`),
                      findCourseCertificate().catch(() => null),
                    ]);
                    setProgress(progressRes.data);
                    if (courseCert && !certificate) {
                      setCertificate(courseCert);
                      showToast("🎉 Certificado gerado com sucesso!", "success");
                    }
                  }}
                />
              </div>
            )}
            {isEnrolled && (
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
                          {(comment.user.id === user?.id || canModerateComments) && (
                            <div className="comment-actions">
                              {comment.user.id === user?.id && (
                                <button
                                  onClick={() => handleEditComment(comment)}
                                  className="btn-secondary"
                                >
                                  Editar
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteComment(comment.id, comment.replies?.length ?? 0)}
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
                                  {(reply.user.id === user?.id || canModerateComments) && (
                                    <div className="comment-actions">
                                      {reply.user.id === user?.id && (
                                        <button
                                          onClick={() => handleEditComment(reply)}
                                          className="btn-secondary"
                                        >
                                          Editar
                                        </button>
                                      )}
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
          {progress && isLearner && (
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
                      <small>
                        Código de verificação:{" "}
                        <Link to={`/certificates/verify/${certificate.verificationCode}`}>
                          {certificate.verificationCode}
                        </Link>
                      </small>
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
              {progress.progressPercentage === 100 && !certificate && (progress.pendingQuizzes?.length ?? 0) > 0 && (
                <div className="certificate-section">
                  <div className="certificate-badge">
                    <span>📝</span>
                    <div>
                      <strong>Aulas concluídas!</strong>
                      <small>Para obter o certificado, seja aprovado nos quizzes:</small>
                      <small>{progress.pendingQuizzes!.map((q) => q.title).join(", ")}</small>
                    </div>
                  </div>
                </div>
              )}
              {progress.progressPercentage === 100 && !certificate && !progress.pendingQuizzes?.length && (
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
                        const certRes = await api.post<CourseCertificate>("/certificates/generate", { courseId: id });
                        setCertificate(certRes.data);
                        showToast("🎉 Certificado gerado com sucesso!", "success");
                      } catch (err) {
                        showToast(
                          getErrorMessage(err, "Erro ao gerar certificado. Verifique se todas as aulas foram concluídas."),
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
        {id && <CourseTags courseId={id} canEdit={isOwner} />}
      </aside>
      {id && (
        <div className="reviews-section" style={{ marginTop: "2rem", padding: "1rem", maxWidth: "1200px", margin: "2rem auto" }}>
          <CourseReviews courseId={id} />
        </div>
      )}
    </div>
  );
}
