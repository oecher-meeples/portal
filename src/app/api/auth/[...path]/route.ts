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
  if (!request.nextUrl.pathname.endsWith("/sign-in/email")) {
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
