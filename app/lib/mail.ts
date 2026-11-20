import { mkdir, appendFile } from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

function getMailFrom() {
  return process.env.MAIL_FROM || "Atelier Copies <no-reply@atelier-copies.local>";
}

function getAdminEmail() {
  return process.env.MAIL_ADMIN_TO || process.env.MAIL_FROM || "admin@atelier-copies.local";
}

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.MAIL_FROM);
}

function shouldUseSmtp() {
  return process.env.MAIL_MODE === "smtp" || isSmtpConfigured();
}

async function writeDevMail(message: MailMessage) {
  const logDir = path.join(process.cwd(), "storage");
  const logPath = path.join(logDir, "email-dev.log");
  const renderedMessage = [
    "============================================================",
    `Date: ${new Date().toISOString()}`,
    `To: ${message.to}`,
    `From: ${getMailFrom()}`,
    message.replyTo ? `Reply-To: ${message.replyTo}` : null,
    `Subject: ${message.subject}`,
    "",
    message.text,
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  await mkdir(logDir, { recursive: true });
  await appendFile(logPath, `${renderedMessage}\n`, "utf8");
}

async function sendSmtpMail(message: MailMessage) {
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  });

  await transporter.sendMail({
    from: getMailFrom(),
    to: message.to,
    subject: message.subject,
    text: message.text,
    replyTo: message.replyTo,
  });
}

export async function sendMail(message: MailMessage) {
  if (shouldUseSmtp()) {
    await sendSmtpMail(message);
    return;
  }

  await writeDevMail(message);
}

export function getNotificationRecipients() {
  return {
    adminEmail: getAdminEmail(),
  };
}
