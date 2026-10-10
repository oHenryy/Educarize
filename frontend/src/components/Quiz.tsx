import { useCallback, useEffect, useState } from "react";
import { api, getErrorMessage, getErrorStatus } from "../api/client";
import type { Quiz, QuizAttempt, QuizQuestion } from "../types";
import { normalizeQuiz } from "../utils/quiz";
import { useToast } from "../context/useToast";

interface QuizProps {
  moduleId: string;
  onComplete?: (attempt: QuizAttempt) => void;
}

/** Questão como exibida: as alternativas guardam o índice original (o que vai para o servidor). */
type DisplayQuestion = QuizQuestion & { displayOptions: { text: string; originalIndex: number }[] };

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Monta a ordem de exibição conforme as opções de embaralhamento do quiz (nova ordem a cada tentativa). */
function buildDisplay(quiz: Quiz): DisplayQuestion[] {
  const questions = quiz.shuffleQuestions ? shuffle(quiz.questions) : quiz.questions;
  return questions.map((q) => {
    const options = q.options.map((text, originalIndex) => ({ text, originalIndex }));
    return { ...q, displayOptions: quiz.shuffleOptions ? shuffle(options) : options };
  });
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function QuizComponent({ moduleId, onComplete }: QuizProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [display, setDisplay] = useState<DisplayQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadQuiz = useCallback(async () => {
    try {
      const res = await api.get<Quiz>(`/quizzes/module/${moduleId}`);
      const quizData = normalizeQuiz(res.data);
      setQuiz(quizData);
      setDisplay(buildDisplay(quizData));
      setAnswers({});
      const history = await api.get<QuizAttempt[]>(`/quizzes/${quizData.id}/attempts`).catch(() => ({ data: [] }));
      setAttempts(history.data);
    } catch (err) {
      setError(getErrorStatus(err) === 404 ? "Nenhum quiz disponível para este módulo" : "Erro ao carregar quiz");
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleSubmit = async () => {
    if (!quiz) return;

    if (quiz.questions.some((q) => answers[q.id] === undefined)) {
      showToast("Por favor, responda todas as questões antes de enviar.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post<QuizAttempt>("/quizzes/attempt", { quizId: quiz.id, answers });
      setAttempt(res.data);
      setQuiz({ ...quiz, attemptsUsed: res.data.attemptsUsed, attemptsRemaining: res.data.attemptsRemaining });
      const history = await api.get<QuizAttempt[]>(`/quizzes/${quiz.id}/attempts`);
      setAttempts(history.data);
      onComplete?.(res.data);
    } catch (err) {
      showToast(getErrorMessage(err, "Erro ao enviar quiz"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!quiz) return;
    setAttempt(null);
    setAnswers({});
    setDisplay(buildDisplay(quiz));
  };

  if (loading) return <div className="loading">Carregando quiz...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!quiz) return null;

  const attemptsRemaining = quiz.attemptsRemaining ?? null;
  const exhausted = attemptsRemaining === 0;
  const resultsById = new Map(attempt?.results?.map((r) => [r.questionId, r]));

  const history = attempts.length > 0 && (
    <>
      <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary">
        {showHistory ? "Ocultar" : "Ver"} Histórico ({attempts.length})
      </button>
      {showHistory && (
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
    </>
  );

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        {quiz.description && <p className="muted">{quiz.description}</p>}
        <p className="quiz-info">
          Nota mínima para aprovação: {quiz.passingScore}%
          {quiz.maxAttempts !== null && (
            <>
              {" "}
              • Tentativas: {quiz.attemptsUsed ?? 0} de {quiz.maxAttempts}
            </>
          )}
        </p>
      </div>

      {attempt ? (
        <div className={`quiz-result ${attempt.passed ? "passed" : "failed"}`}>
          <h3>{attempt.passed ? "✓ Parabéns! Você passou!" : "✗ Você não atingiu a nota mínima"}</h3>
          <p className="quiz-score">
            Sua nota: <strong>{attempt.score}%</strong>
          </p>
          <p className="quiz-passing">Nota mínima: {quiz.passingScore}%</p>

          <ol className="quiz-feedback">
            {display.map((question) => {
              const result = resultsById.get(question.id);
              if (!result) return null;
              const selectedText = result.selected !== null ? question.options[result.selected] : "—";
              return (
                <li key={question.id} className={result.correct ? "correct" : "incorrect"}>
                  <strong>{question.question}</strong>
                  <div>
                    {result.correct ? "✓" : "✗"} Sua resposta: {selectedText}
                  </div>
                  {!result.correct && result.correctAnswer !== undefined && (
                    <div>Resposta correta: {question.options[result.correctAnswer]}</div>
                  )}
                  {result.explanation && <div className="muted">{result.explanation}</div>}
                </li>
              );
            })}
          </ol>

          {!attempt.answersRevealed && (
            <p className="quiz-retry">
              As respostas corretas aparecem quando você for aprovado
              {quiz.maxAttempts !== null ? " ou esgotar as tentativas" : ""}.
            </p>
          )}

          <div className="quiz-result-actions">
            {!attempt.passed && !exhausted && (
              <button onClick={handleRetry} className="btn-primary">
                Tentar Novamente
                {attemptsRemaining !== null && ` (${attemptsRemaining} restante${attemptsRemaining === 1 ? "" : "s"})`}
              </button>
            )}
            {history}
          </div>
        </div>
      ) : exhausted ? (
        <div className={`quiz-result ${quiz.passed ? "passed" : "failed"}`}>
          <h3>{quiz.passed ? "✓ Você já foi aprovado neste quiz" : "Você usou todas as tentativas deste quiz"}</h3>
          <div className="quiz-result-actions">{history}</div>
        </div>
      ) : (
        <>
          <div className="quiz-questions">
            {display.map((question, index) => (
              <div key={question.id} className="quiz-question">
                <h4>
                  {index + 1}. {question.question}
                </h4>
                <div className="quiz-options">
                  {question.displayOptions.map(({ text, originalIndex }) => (
                    <label
                      key={originalIndex}
                      className={`quiz-option ${answers[question.id] === originalIndex ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={originalIndex}
                        checked={answers[question.id] === originalIndex}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: originalIndex }))}
                      />
                      <span>{text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="quiz-actions">
            {quiz.passed && <span className="muted">Você já foi aprovado; uma nova tentativa não altera isso.</span>}
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={submitting || quiz.questions.some((q) => answers[q.id] === undefined)}
            >
              {submitting ? "Enviando..." : "Enviar Respostas"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
