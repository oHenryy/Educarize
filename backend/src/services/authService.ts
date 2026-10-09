import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { config, requireEmailVerification } from "../config/env";
import { logActivity } from "../utils/activityLogger";
import { HttpError } from "../utils/httpError";
import { sendMail } from "../utils/mailer";
import { hashToken, randomToken, SessionService, SessionTokens } from "./sessionService";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
};

export interface AuthResult {
  tokens: SessionTokens;
  user: PublicUser;
}

type TokenType = "PASSWORD_RESET" | "EMAIL_VERIFICATION";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  emailVerifiedAt: true,
} as const;

const toPublicUser = (u: PublicUser): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  avatarUrl: u.avatarUrl,
  emailVerifiedAt: u.emailVerifiedAt,
});

const sessions = new SessionService();

export class AuthService {
  async register(data: RegisterData): Promise<AuthResult> {
    const { name, email, password } = data;

    // Auto-registro só pode criar alunos ou instrutores; ADMIN é concedido apenas por outro admin.
    const selfAssignableRoles = ["STUDENT", "INSTRUCTOR"];
    const role = data.role && selfAssignableRoles.includes(data.role) ? data.role : "STUDENT";

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "Email já cadastrado");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
    });

    await logActivity({
      action: "USER_CREATED",
      description: `Usuário "${user.name}" (${user.email}) criado`,
      resourceId: user.id,
      resourceType: "USER",
      userId: user.id,
    });

    await this.sendVerificationEmail(user).catch((err) =>
      console.error("Erro ao enviar e-mail de verificação:", err)
    );

    return { tokens: await sessions.createSession(user), user: toPublicUser(user) };
  }

  async login(data: LoginData): Promise<AuthResult> {
    const { email, password } = data;

    // Novos cadastros são gravados em minúsculas; contas antigas podem ter maiúsculas no e-mail.
    const user =
      (await prisma.user.findUnique({ where: { email: email.toLowerCase() } })) ??
      (await prisma.user.findUnique({ where: { email } }));
    if (!user) {
      throw new HttpError(401, "Credenciais inválidas");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new HttpError(401, "Credenciais inválidas");
    }

    if (requireEmailVerification() && !user.emailVerifiedAt) {
      throw new HttpError(403, "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
    }

    return { tokens: await sessions.createSession(user), user: toPublicUser(user) };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...publicUserSelect, createdAt: true },
    });

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    return { user };
  }

  /** Troca a senha e encerra as demais sessões; devolve uma sessão nova para o dispositivo atual. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<SessionTokens> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new HttpError(400, "Senha atual incorreta");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    await sessions.revokeAll(userId);
    return sessions.createSession(user);
  }

  // ---------- recuperação de senha ----------

  /** Sempre responde igual, exista ou não a conta, para não revelar quais e-mails estão cadastrados. */
  async requestPasswordReset(email: string): Promise<void> {
    const user =
      (await prisma.user.findUnique({ where: { email: email.toLowerCase() } })) ??
      (await prisma.user.findUnique({ where: { email } }));
    if (!user) return;

    const token = await this.issueToken(user.id, "PASSWORD_RESET", config.passwordResetTtlMs);
    const link = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: user.email,
      subject: "Redefinição de senha — Educarize",
      text:
        `Olá, ${user.name}!\n\nRecebemos um pedido para redefinir sua senha. ` +
        `Use o link abaixo (válido por 1 hora):\n\n${link}\n\n` +
        "Se você não fez esse pedido, ignore este e-mail.",
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const stored = await this.consumeToken(token, "PASSWORD_RESET");

    await prisma.user.update({
      where: { id: stored.userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        // O link chegou pelo e-mail: ele está confirmado.
        emailVerifiedAt: stored.user.emailVerifiedAt ?? new Date(),
      },
    });

    // Quem tinha a senha antiga (ou uma sessão roubada) perde o acesso.
    await sessions.revokeAll(stored.userId);
  }

  // ---------- verificação de e-mail ----------

  async sendVerificationEmail(user: { id: string; name: string; email: string; emailVerifiedAt: Date | null }) {
    if (user.emailVerifiedAt) return;

    const token = await this.issueToken(user.id, "EMAIL_VERIFICATION", config.emailVerificationTtlMs);
    const link = `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: user.email,
      subject: "Confirme seu e-mail — Educarize",
      text: `Olá, ${user.name}!\n\nConfirme seu e-mail acessando o link abaixo:\n\n${link}\n`,
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(404, "Usuário não encontrado");
    if (user.emailVerifiedAt) throw new HttpError(400, "Seu e-mail já está confirmado");
    await this.sendVerificationEmail(user);
  }

  async verifyEmail(token: string): Promise<void> {
    const stored = await this.consumeToken(token, "EMAIL_VERIFICATION");
    if (!stored.user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } });
    }
  }

  // ---------- tokens de uso único ----------

  private async issueToken(userId: string, type: TokenType, ttlMs: number): Promise<string> {
    // Um novo pedido invalida os links anteriores do mesmo tipo.
    await prisma.authToken.updateMany({
      where: { userId, type, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomToken();
    await prisma.authToken.create({
      data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return token;
  }

  private async consumeToken(token: string, type: TokenType) {
    const stored = await prisma.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!stored || stored.type !== type || stored.usedAt || stored.expiresAt < new Date()) {
      throw new HttpError(400, "Link inválido ou expirado. Solicite um novo.");
    }

    await prisma.authToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } });
    return stored;
  }
}
