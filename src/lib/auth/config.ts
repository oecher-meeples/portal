import type { BetterAuthOptions } from "better-auth";
import { createLocalAccountIssuer } from "better-auth/db";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/lib/auth/password";

/**
 * Self-hosted better-auth configuration (docs/adr/0015) — split from
 * `server.ts` so the integration test (`config.test.ts`) can run the exact
 * same options against better-auth's in-memory adapter, without Prisma or
 * `next/headers`.
 *
 * Model names map better-auth's `user`/`session`/`account`/`verification`
 * onto our own Prisma models (`AuthUser`, …) instead of generic names that
 * would collide with the domain vocabulary (`Member`, `Account` …).
 */
export const AUTH_MODEL_NAMES = {
  user: "authUser",
  session: "authSession",
  account: "authAccount",
  verification: "authVerification",
} as const;

/**
 * HTTP endpoints better-auth (or the email-OTP plugin) would expose by
 * default but that this portal must NOT offer. `disabledPaths` only blocks
 * the HTTP router — server-side `auth.api.*` calls still work, which is what
 * `createCredentialUser()` and `requestPasswordReset` (Systemkonto) rely on.
 *
 * - `/sign-up/email`: registration is invite-only (`redeemInvite`), never
 *   public. (Neon Auth's hosted config had public sign-up left enabled.)
 * - OTP sign-in / OTP email verification / OTP email change: a second,
 *   un-rate-limited login path next to `/sign-in/email` (which our route
 *   handler rate-limits, #326) — and email-OTP sign-in would create accounts.
 * - `/forget-password/email-otp` (deprecated alias) and
 *   `/request-password-reset` (link flow): equivalent to
 *   `/email-otp/request-password-reset` but would bypass the forgot-password
 *   IP cooldown in `src/app/api/auth/[...path]/route.ts`.
 */
export const DISABLED_AUTH_PATHS = [
  "/sign-up/email",
  "/sign-in/email-otp",
  "/email-otp/send-verification-otp",
  "/email-otp/check-verification-otp",
  "/email-otp/verify-email",
  "/forget-password/email-otp",
  "/email-otp/request-email-change",
  "/email-otp/change-email",
  "/request-password-reset",
];

/** Comma-separated extra origins (e.g. the dev server reached via a LAN IP).
 * `BETTER_AUTH_URL`'s own origin is always trusted by better-auth itself. */
export function parseTrustedOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function sendPasswordResetOtpMail(email: string, otp: string) {
  await sendTransactionalEmail({
    to: email,
    subject: "Dein Code zum Zurücksetzen des Passworts",
    html: [
      "<p>Hallo,</p>",
      "<p>du hast im Oecher-Meeples-Portal ein neues Passwort angefordert. Dein Code lautet:</p>",
      `<p style="font-size:1.5em;font-weight:bold;letter-spacing:0.2em">${otp}</p>`,
      "<p>Der Code ist 5 Minuten gültig. Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>",
    ].join("\n"),
  });
}

async function sendPasswordResetLinkMail(email: string, url: string) {
  // `url` is built by better-auth from BETTER_AUTH_URL + a random token +
  // the URL-encoded callback — no user-controlled markup to escape.
  await sendTransactionalEmail({
    to: email,
    subject: "Lege dein Passwort für das Oecher-Meeples-Portal fest",
    html: [
      "<p>Hallo,</p>",
      "<p>für dich wurde ein Zugang zum Oecher-Meeples-Portal angelegt bzw. ein neues Passwort angefordert. Über den folgenden Link legst du dein Passwort fest:</p>",
      `<p><a href="${url}">${url}</a></p>`,
      "<p>Der Link ist eine Stunde gültig. Falls du das nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>",
    ].join("\n"),
  });
}

export function buildAuthOptions({
  baseURL,
  secret,
  trustedOrigins,
  database,
}: {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  database: NonNullable<BetterAuthOptions["database"]>;
}) {
  return {
    appName: "Oecher Meeples",
    baseURL,
    secret,
    trustedOrigins,
    database,
    user: { modelName: AUTH_MODEL_NAMES.user },
    session: { modelName: AUTH_MODEL_NAMES.session },
    account: { modelName: AUTH_MODEL_NAMES.account },
    verification: { modelName: AUTH_MODEL_NAMES.verification },
    // UUIDs as before in Neon Auth, so migrated `neonAuthUserId` values and
    // newly created ones share one format.
    advanced: { database: { generateId: "uuid" } },
    // Self-hosted: no usage pings to better-auth's telemetry endpoint, even
    // if BETTER_AUTH_TELEMETRY is set in the environment.
    telemetry: { enabled: false },
    disabledPaths: DISABLED_AUTH_PATHS,
    emailAndPassword: {
      enabled: true,
      // Invite-only — accounts are created server-side via
      // `createCredentialUser()`, never through the public sign-up endpoint.
      disableSignUp: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      // Classic token link — used by the Systemkonto flow (#329/#363), whose
      // `redirectTo` lands on /passwort-vergessen/einloesen?token=….
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetLinkMail(user.email, url);
      },
    },
    plugins: [
      emailOTP({
        // "Passwort vergessen" (#324): code instead of link.
        disableSignUp: true,
        expiresIn: 5 * 60,
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "forget-password") {
            // Every other OTP flow is unreachable (DISABLED_AUTH_PATHS) —
            // fail loudly rather than send an unexpected code mail.
            throw new Error(`Unerwarteter OTP-Typ "${type}"`);
          }
          await sendPasswordResetOtpMail(email, otp);
        },
      }),
      // Must stay last (better-auth warns otherwise): writes Set-Cookie from
      // `auth.api.*` calls in Server Actions/Route Handlers into Next's
      // `cookies()`; silently skipped where Next forbids cookie writes.
      nextCookies(),
    ],
  } satisfies BetterAuthOptions;
}

/** Minimal slice of better-auth's `AuthContext` that `createCredentialUser`
 * needs — keeps it testable against any `betterAuth()` instance. */
type AuthContextLike = {
  password: { hash: (password: string) => Promise<string> };
  internalAdapter: {
    findUserByEmail: (email: string) => Promise<unknown>;
    createUser: (
      user: { email: string; name: string; emailVerified: boolean },
      source: { method: "email-password" },
    ) => Promise<{ id: string } | null>;
    linkAccount: (account: {
      userId: string;
      providerId: string;
      issuer: string;
      accountId: string;
      password: string;
    }) => Promise<unknown>;
  };
};

/**
 * Creates an email+password login WITHOUT a session — for the invite
 * redemption (`redeemInvite`) and the Systemkonto flow, both of which run in
 * a Server Action of someone else (or nobody) and must not log the browser
 * in as the new account.
 *
 * Deliberately not `auth.api.signUpEmail`: public sign-up is disabled, and
 * with `autoSignIn: false` better-auth would answer a duplicate email with a
 * *synthetic* success user (enumeration protection) — the caller would then
 * link roles/Meeple to an id that doesn't exist. This mirrors signUpEmail's
 * own steps (normalise email, hash, createUser, credential account with
 * `accountId = userId`), but reports a duplicate honestly.
 *
 * Returns better-auth's own English error messages so `translateAuthError()`
 * keeps working unchanged.
 */
export async function createCredentialUser(
  authContext: Promise<AuthContextLike> | AuthContextLike,
  input: { email: string; name: string; password: string },
): Promise<{ userId: string } | { error: string }> {
  const ctx = await authContext;
  const email = input.email.trim().toLowerCase();

  if (validatePassword(input.password)) {
    return { error: "Password does not meet security requirements" };
  }
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    return { error: "User already exists" };
  }

  const hash = await ctx.password.hash(input.password);
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: input.name.trim() || email.split("@")[0],
      // Same as better-auth's own sign-up. Nothing in the portal requires a
      // verified email (Neon Auth's hosted config didn't either).
      emailVerified: false,
    },
    // Same provisioning source better-auth's own sign-up reports to
    // `validateUserInfo` hooks (none configured here).
    { method: "email-password" },
  );
  if (!user) {
    return { error: "Failed to create user" };
  }
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    issuer: createLocalAccountIssuer("credential"),
    accountId: user.id,
    password: hash,
  });
  return { userId: user.id };
}
