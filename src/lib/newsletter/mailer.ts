import nodemailer, { type Transporter } from "nodemailer";

const DEFAULT_FROM = '"Oecher Meeples" <newsletter@oecher-meeples.org>';
const DEFAULT_PORT = 587;
const TIMEOUT_MS = 8000;

export class MailerError extends Error {
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

/** `null` = SMTP not configured → sending is a deliberate no-op (see docs/deployment-docker.md). */
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

let warnedUnconfigured = false;

/**
 * Provider-agnostic SMTP mailer — one recipient per call, no BCC/merge.
 * Without SMTP_HOST it logs once and resolves without sending (no crash).
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const config = readSmtpConfig();
  if (!config) {
    if (!warnedUnconfigured) {
      warnedUnconfigured = true;
      console.warn(
        "[mailer] SMTP_HOST ist nicht gesetzt — E-Mail-Versand ist deaktiviert, Mails werden verworfen.",
      );
    }
    console.info(`[mailer] Nicht versendet (SMTP aus): "${subject}"`);
    return;
  }

  try {
    await getTransporter(config).sendMail({
      from: process.env.SMTP_FROM || DEFAULT_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new MailerError(`SMTP-Versand fehlgeschlagen: ${detail}`);
  }
}
