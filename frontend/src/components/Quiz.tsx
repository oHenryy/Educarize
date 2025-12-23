import { useState, useEffect } from "react";
import { api } from "../api/client";
import type { Quiz, QuizAttempt } from "../types";
import { useToast } from "../context/ToastContext";

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

interface QuizProps {
  moduleId: string;
  onComplete?: (attempt: QuizAttempt) => void;
}

export default function QuizComponent({ moduleId, onComplete }: QuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [questionId: string]: number }>({});
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const res = await api.get<Quiz>(`/quizzes/module/${moduleId}`);
        const quizData = {
          ...res.data,
          questions: res.data.questions.map((q: any) => ({
            ...q,
            options: parseOptions(q.options),
          })),
        };
        setQuiz(quizData);
        const initialAnswers: { [questionId: string]: number } = {};
        quizData.questions.forEach((q) => {
          initialAnswers[q.id] = -1;
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError("Nenhum quiz disponível para este módulo");
        } else {
          setError("Erro ao carregar quiz");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchQuiz();
  }, [moduleId]);

  useEffect(() => {
    if (!quiz || !quiz.id) return;

    const quizId = quiz.id;
    async function fetchAttempts() {
      try {
        const res = await api.get<QuizAttempt[]>(`/quizzes/${quizId}/attempts`);
        setAttempts(res.data);
      } catch (err) {
        console.warn("Erro ao carregar histórico:", err);
      }
    }

    fetchAttempts();
  }, [quiz?.id]);

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    if (!quiz) return;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answerIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    const allAnswered = quiz.questions.every((q) => answers[q.id] !== -1);
    if (!allAnswered) {
      showToast("Por favor, responda todas as questões antes de enviar.", "error");
      return;
    }

    try {
      const res = await api.post<QuizAttempt>("/quizzes/attempt", {
        quizId: quiz.id,
        answers,
      });
      setAttempt(res.data);
      setSubmitted(true);
      const attemptsRes = await api.get<QuizAttempt[]>(`/quizzes/${quiz.id}/attempts`);
      setAttempts(attemptsRes.data);
      if (onComplete) {
        onComplete(res.data);
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || "Erro ao enviar quiz", "error");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <div className="loading">Carregando quiz...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!quiz) return null;

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        {quiz.description && <p className="muted">{quiz.description}</p>}
        <p className="quiz-info">
          Nota mínima para aprovação: {quiz.passingScore}%
        </p>
      </div>

      {submitted && attempt ? (
        <div className={`quiz-result ${attempt.passed ? "passed" : "failed"}`}>
          <h3>
            {attempt.passed ? "✓ Parabéns! Você passou!" : "✗ Você não atingiu a nota mínima"}
          </h3>
          <p className="quiz-score">
            Sua nota: <strong>{attempt.score}%</strong>
          </p>
          <p className="quiz-passing">
            Nota mínima: {quiz.passingScore}%
          </p>
          {!attempt.passed && (
            <p className="quiz-retry">
              Você pode tentar novamente estudando mais o conteúdo.
            </p>
          )}
          <div className="quiz-result-actions">
            <button
              onClick={() => {
                setSubmitted(false);
                setAttempt(null);
                const initialAnswers: { [questionId: string]: number } = {};
                quiz.questions.forEach((q) => {
                  initialAnswers[q.id] = -1;
                });
                setAnswers(initialAnswers);
              }}
              className="btn-primary"
            >
              Tentar Novamente
            </button>
            {attempts.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary"
              >
                {showHistory ? "Ocultar" : "Ver"} Histórico ({attempts.length})
              </button>
            )}
          </div>
          {showHistory && attempts.length > 0 && (
            <div className="quiz-history">
              <h4>Histórico de Tentativas</h4>
              <div className="attempts-list">
                {attempts.map((att) => (
                  <div key={att.id} className={`attempt-item ${att.passed ? "passed" : "failed"}`}>
                    <div className="attempt-header">
                      <span className="attempt-date">{formatDate(att.completedAt)}</span>
                      <span className={`attempt-badge ${att.passed ? "passed" : "failed"}`}>
                        {att.passed ? "✓ Aprovado" : "✗ Reprovado"}
                      </span>
                    </div>
                    <div className="attempt-score">
                      Nota: <strong>{att.score}%</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="quiz-questions">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="quiz-question">
                <h4>
                  {index + 1}. {question.question}
                </h4>
                <div className="quiz-options">
                  {question.options.map((option, optionIndex) => (
                    <label
                      key={optionIndex}
                      className={`quiz-option ${
                        answers[question.id] === optionIndex ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={optionIndex}
                        checked={answers[question.id] === optionIndex}
                        onChange={() => handleAnswerChange(question.id, optionIndex)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="quiz-actions">
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={quiz.questions.some((q) => answers[q.id] === -1)}
            >
              Enviar Respostas
            </button>
          </div>
        </>
      )}
    </div>
  );
}

