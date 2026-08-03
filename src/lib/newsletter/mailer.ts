import { requireEnv } from "@/lib/utils/require-env";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const FETCH_TIMEOUT_MS = 8000;

export class BrevoApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrevoApiError";
  }
}

function senderEmail(): string {
  return process.env.BREVO_SENDER_EMAIL || "newsletter@oecher-meeples.org";
}

function senderName(): string {
  return process.env.BREVO_SENDER_NAME || "Oecher Meeples";
}

/** Thin Brevo transactional-email wrapper — one recipient per call, no BCC/merge. */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = requireEnv("BREVO_API_KEY");

  let response: Response;
  try {
    response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail(), name: senderName() },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new BrevoApiError("Die Anfrage an Brevo hat zu lange gedauert.");
    }
    throw error;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new BrevoApiError(
      (body as { message?: string } | null)?.message ??
        `Brevo-Versand fehlgeschlagen (${response.status})`,
    );
  }
}
