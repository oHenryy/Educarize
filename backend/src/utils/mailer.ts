import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { config } from "../config/env";

export type MailMessage = { to: string; subject: string; text: string; html?: string };

/** E-mails "enviados" durante os testes, para que possam ser inspecionados. */
export const sentTestEmails: MailMessage[] = [];

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendMail(message: MailMessage): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    sentTestEmails.push(message);
    return;
  }

  // Caixa de saída local (desenvolvimento e testes de ponta a ponta): um arquivo JSON por e-mail.
  if (process.env.MAIL_OUTBOX_DIR) {
    fs.mkdirSync(process.env.MAIL_OUTBOX_DIR, { recursive: true });
    const file = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.json`;
    fs.writeFileSync(path.join(process.env.MAIL_OUTBOX_DIR, file), JSON.stringify({ ...message, sentAt: new Date() }));
  }

  if (!transporter) {
    // Desenvolvimento sem SMTP: mostra o e-mail no console para que os links possam ser usados.
    console.log(`\n[E-MAIL] Para: ${message.to}\nAssunto: ${message.subject}\n\n${message.text}\n`);
    return;
  }

  await transporter.sendMail({ from: config.mailFrom, ...message });
}
