import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";

type VerifiedCertificate = {
  valid: true;
  verificationCode: string;
  studentName: string;
  courseTitle: string;
  courseDurationHours: number;
  instructorName: string;
  issuedAt: string;
};

/** Página pública: confere a autenticidade de um certificado pelo código impresso (ou pelo QR code). */
export default function VerifyCertificatePage() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState(code ?? "");
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    async function verify() {
      setLoading(true);
      setError(null);
      setCertificate(null);
      try {
        const { data } = await api.get<VerifiedCertificate>(`/certificates/verify/${encodeURIComponent(code!)}`);
        if (!cancelled) setCertificate(data);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Não foi possível verificar o certificado agora."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = input.trim();
    if (normalized) navigate(`/certificates/verify/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="auth-card">
      <h1>Verificar certificado</h1>
      <p className="muted">Informe o código impresso no certificado ou acesse pelo QR code.</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="code">Código de verificação</label>
          <input
            id="code"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ABCD-EFGH-JKMN"
            autoComplete="off"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Verificando..." : "Verificar"}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: "16px" }} role="alert">
          {error}
        </div>
      )}

      {certificate && (
        <div className="success-message" style={{ marginTop: "16px" }} role="status">
          <strong>✓ Certificado autêntico</strong>
          <dl style={{ margin: "8px 0 0", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px" }}>
            <dt>Aluno</dt>
            <dd style={{ margin: 0 }}>{certificate.studentName}</dd>
            <dt>Curso</dt>
            <dd style={{ margin: 0 }}>{certificate.courseTitle}</dd>
            <dt>Carga horária</dt>
            <dd style={{ margin: 0 }}>{certificate.courseDurationHours} horas</dd>
            <dt>Instrutor</dt>
            <dd style={{ margin: 0 }}>{certificate.instructorName}</dd>
            <dt>Emitido em</dt>
            <dd style={{ margin: 0 }}>{new Date(certificate.issuedAt).toLocaleDateString("pt-BR")}</dd>
            <dt>Código</dt>
            <dd style={{ margin: 0 }}>{certificate.verificationCode}</dd>
          </dl>
        </div>
      )}

      <p className="muted" style={{ marginTop: "12px" }}>
        <Link to="/catalog">Ir para o Educarize</Link>
      </p>
    </div>
  );
}
