import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import type { NotificationCategory, NotificationPreference } from "../types";

const CATEGORY_INFO: Record<NotificationCategory, { label: string; hint: string }> = {
  MESSAGE: { label: "Mensagens diretas", hint: "Só quando você não está com o Educarize aberto." },
  COMMENT: { label: "Comentários e respostas", hint: "Respostas aos seus comentários e dúvidas nas suas aulas." },
  CERTIFICATE: { label: "Certificados", hint: "Quando um certificado seu é emitido." },
  REVIEW: { label: "Avaliações", hint: "Novas avaliações nos cursos que você criou." },
  QUIZ: { label: "Resultados de quizzes", hint: "Aprovação ou reprovação em cada tentativa." },
  ENROLLMENT: { label: "Matrículas", hint: "Suas matrículas e novos alunos nos seus cursos e trilhas." },
  PROGRESS: { label: "Progresso", hint: "Cada aula concluída e trilhas finalizadas." },
};

/** Escolha, por assunto, de quais notificações também chegam por e-mail. */
export default function EmailPreferences() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [saving, setSaving] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    api
      .get<NotificationPreference[]>("/notifications/preferences")
      .then((res) => setPreferences(res.data))
      .catch((err) => showToast(getErrorMessage(err, "Erro ao carregar preferências"), "error"));
  }, [showToast]);

  const toggle = async (category: NotificationCategory, email: boolean) => {
    // Otimista: o checkbox muda na hora e volta ao valor anterior se a API recusar.
    const previous = preferences;
    setPreferences((current) => current?.map((pref) => (pref.category === category ? { ...pref, email } : pref)) ?? null);
    setSaving(category);
    try {
      const res = await api.put<NotificationPreference[]>("/notifications/preferences", { email: { [category]: email } });
      setPreferences(res.data);
      showToast("Preferência salva.", "success");
    } catch (err) {
      setPreferences(previous);
      showToast(getErrorMessage(err, "Erro ao salvar preferência"), "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="email-preferences">
      <h3>Notificações por e-mail</h3>
      <p className="muted">
        Todas as notificações continuam aparecendo no sino. Escolha quais também devem chegar em {user?.email}.
      </p>
      {!user?.emailVerifiedAt && (
        <p className="warning-text">Confirme seu e-mail para começar a receber as notificações por e-mail.</p>
      )}
      {preferences === null ? (
        <p className="muted">Carregando...</p>
      ) : (
        <ul>
          {preferences.map(({ category, email }) => (
            <li key={category}>
              <label>
                <input
                  type="checkbox"
                  checked={email}
                  disabled={saving !== null}
                  onChange={(e) => toggle(category, e.target.checked)}
                />
                <span>
                  <strong>{CATEGORY_INFO[category].label}</strong>
                  <small className="muted">{CATEGORY_INFO[category].hint}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
