import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  checkFixedCooldown,
  checkLoginBackoff,
  recordLoginFailure,
  resetLoginBackoffIfSameIp,
} from "@/lib/utils/rate-limit";
import { getRequestIp } from "@/lib/utils/request-ip";

const { GET, POST: authPost } = auth.handler();
export { GET };

/** Reiner Spam-/Lastschutz, keine Brute-Force-Grenze für sich genommen (#326,
 * Mechanismus 1). */
const LOGIN_IP_COOLDOWN_SECONDS = 2;

/** Missbrauchsschutz für die "Passwort vergessen"-Anfrage (#324) — verhindert
 * E-Mail-Enumeration durch Masse-Anfragen, ohne dass die Antwort selbst
 * (immer `{success:true}`, unabhängig vom Konto-Zustand) sich unterscheidet. */
const FORGOT_PASSWORD_IP_COOLDOWN_SECONDS = 30;

/**
 * Selbe Fehlermeldung wie Better Auth für ungültige Zugangsdaten — damit ein
 * Client (und ein Angreifer) den Rate-Limit-Fall nicht von "Passwort falsch"
 * unterscheiden kann (Enumeration-Schutz, #326).
 */
function invalidCredentialsResponse() {
  return NextResponse.json(
    { code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password" },
    { status: 401 },
  );
}

async function extractEmail(request: NextRequest): Promise<string | null> {
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    return typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

/**
 * Rate-Limiting für den Credentials-Login (#326) — muss hier ansetzen, weil
 * `src/components/feature/login/login-form.tsx` direkt gegen
 * `authClient.signIn.email()` spricht, das auf diese Route läuft, ohne einen
 * eigenen Server-Action-Zwischenschritt.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith("/forget-password/email-otp")) {
    return handleForgotPasswordRequest(request, context);
  }
  if (!pathname.endsWith("/sign-in/email")) {
    return authPost(request, context);
  }

  const ip = await getRequestIp();
  const ipCooldown = await checkFixedCooldown(
    `login:ip:${ip ?? "unknown"}`,
    LOGIN_IP_COOLDOWN_SECONDS,
  );
  if (!ipCooldown.allowed) {
    return invalidCredentialsResponse();
  }

  const email = await extractEmail(request);
  const emailKey = email ? `login:email:${email}` : null;

  if (emailKey) {
    const backoff = await checkLoginBackoff(emailKey);
    if (!backoff.allowed) {
      return invalidCredentialsResponse();
    }
  }

  const response = await authPost(request, context);

  if (emailKey) {
    if (response.status === 200) {
      await resetLoginBackoffIfSameIp(emailKey, ip);
    } else {
      await recordLoginFailure(emailKey, ip);
    }
  }

  return response;
}

async function handleForgotPasswordRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const ip = await getRequestIp();
  const cooldown = await checkFixedCooldown(
    `forgot-password:ip:${ip ?? "unknown"}`,
    FORGOT_PASSWORD_IP_COOLDOWN_SECONDS,
  );
  if (!cooldown.allowed) {
    // Gleiche Antwort wie ein echter Erfolg — Neon Auth meldet hier ohnehin
    // immer `{success:true}`, unabhängig davon, ob das Konto existiert.
    return NextResponse.json({ success: true }, { status: 200 });
  }
  return authPost(request, context);
}
