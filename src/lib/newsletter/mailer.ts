import nodemailer, { type Transporter } from "nodemailer";
import type { EmailAttachment } from "@/lib/newsletter/post-email-body";
import { UserFacingError } from "@/lib/utils/action-result";

const DEFAULT_FROM = '"Oecher Meeples" <newsletter@oecher-meeples.org>';
const DEFAULT_PORT = 587;
const TIMEOUT_MS = 8000;

/** User-facing (#612): "Versand fehlgeschlagen" is exactly what the person
 * who triggered the mail needs to see, not a generic "Unbekannter Fehler". */
export class MailerError extends UserFacingError {
  constructor(message: string) {
    super(message);
    this.name = "MailerError";
  }
}

type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
};

/** `null` = SMTP not configured → every send fails with a `MailerError` (#612). */
function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const rawPort = process.env.SMTP_PORT?.trim();
  const port = rawPort ? Number(rawPort) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port <= 0) {
    throw new MailerError(`Ungültiger SMTP_PORT: ${rawPort}`);
  }
  return {
    host,
    port,
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
  };
}

let cached: { key: string; transporter: Transporter } | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  const key = JSON.stringify(config);
  if (cached?.key === key) return cached.transporter;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 = implicit TLS; every other port negotiates STARTTLS when offered.
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
  cached = { key, transporter };
  return transporter;
}

/**
 * Provider-agnostic SMTP mailer — one recipient per call, no BCC/merge.
 * Without SMTP_HOST it throws instead of pretending to send (#612): a silent
 * no-op let callers mark newsletter jobs SENT and report "Mail verschickt"
 * although nothing left the server.
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  /** Inline-Anhänge, im HTML per `cid:<cid>` referenziert. */
  attachments?: EmailAttachment[];
}): Promise<void> {
  const config = readSmtpConfig();
  if (!config) {
    throw new MailerError(
      "E-Mail-Versand ist nicht konfiguriert (SMTP_HOST fehlt).",
    );
  }

  try {
    await getTransporter(config).sendMail({
      from: process.env.SMTP_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
      attachments,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new MailerError(`SMTP-Versand fehlgeschlagen: ${detail}`);
  }
}
