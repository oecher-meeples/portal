import { beforeEach, describe, expect, it, vi } from "vitest";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

const sentMails: { to: string; subject: string; html: string }[] = [];
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: async (mail: {
    to: string;
    subject: string;
    html: string;
  }) => {
    sentMails.push(mail);
  },
}));

const { buildAuthOptions, createCredentialUser, AUTH_MODEL_NAMES } =
  await import("./config");

/**
 * Integration test for the self-hosted better-auth setup (ADR 0015): the
 * real `buildAuthOptions()` — plugins, disabled paths, password policy,
 * model mapping — against better-auth's in-memory adapter instead of Prisma.
 * Replaces the former `server.live.test.ts`, which hit Neon's hosted auth
 * endpoint: there is no foreign auth API anymore, so the end-to-end login
 * path can now be checked deterministically in the normal suite.
 */
const BASE_URL = "http://localhost:3002";

function createTestAuth() {
  const db = Object.fromEntries(
    Object.values(AUTH_MODEL_NAMES).map((model) => [model, []]),
  );
  return betterAuth(
    buildAuthOptions({
      baseURL: BASE_URL,
      secret: "integration-test-secret-with-enough-entropy-123456",
      trustedOrigins: [],
      database: memoryAdapter(db),
    }),
  );
}

type TestAuth = ReturnType<typeof createTestAuth>;

function post(auth: TestAuth, path: string, body: unknown, cookie?: string) {
  return auth.handler(
    new Request(`${BASE_URL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: BASE_URL,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

function sessionCookieFrom(response: Response) {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.includes("session_token="));
  return cookie?.split(";")[0];
}

const USER = {
  email: "Member@Example.com",
  name: "Max Muster",
  password: "correct horse battery",
};

let auth: TestAuth;

beforeEach(() => {
  sentMails.length = 0;
  auth = createTestAuth();
});

describe("createCredentialUser", () => {
  it("creates a login that can sign in with email + password", async () => {
    const created = await createCredentialUser(auth.$context, USER);
    expect(created).toEqual({ userId: expect.any(String) });

    const response = await post(auth, "/sign-in/email", {
      email: "member@example.com",
      password: USER.password,
    });

    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response)).toBeDefined();
  });

  it("uses UUIDs, so new ids match the format of migrated Neon Auth ids", async () => {
    const created = await createCredentialUser(auth.$context, USER);

    expect("userId" in created && created.userId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("reports a duplicate email honestly instead of a synthetic success", async () => {
    await createCredentialUser(auth.$context, USER);

    expect(
      await createCredentialUser(auth.$context, {
        ...USER,
        email: "member@example.com",
      }),
    ).toEqual({ error: "User already exists" });
  });

  it("rejects a password outside the policy", async () => {
    expect(
      await createCredentialUser(auth.$context, { ...USER, password: "short" }),
    ).toEqual({ error: "Password does not meet security requirements" });
  });
});

describe("sign-in and session", () => {
  it("rejects a wrong password with better-auth's generic message", async () => {
    await createCredentialUser(auth.$context, USER);

    const response = await post(auth, "/sign-in/email", {
      email: USER.email,
      password: "wrong password!",
    });

    expect(response.status).toBe(401);
    expect((await response.json()).message).toBe("Invalid email or password");
  });

  it("resolves the session from the cookie, incl. session.createdAt (#231)", async () => {
    await createCredentialUser(auth.$context, USER);
    const signIn = await post(auth, "/sign-in/email", {
      email: USER.email,
      password: USER.password,
    });
    const cookie = sessionCookieFrom(signIn)!;

    const session = await auth.api.getSession({
      headers: new Headers({ cookie }),
      query: { disableRefresh: true },
    });

    expect(session?.user.email).toBe("member@example.com");
    expect(session?.session.createdAt).toBeInstanceOf(Date);
  });

  it("returns null without a session cookie", async () => {
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  });

  it("invalidates the session on sign-out and clears the cookie", async () => {
    await createCredentialUser(auth.$context, USER);
    const signIn = await post(auth, "/sign-in/email", {
      email: USER.email,
      password: USER.password,
    });
    const cookie = sessionCookieFrom(signIn)!;

    const { headers } = await auth.api.signOut({
      headers: new Headers({ cookie }),
      returnHeaders: true,
    });

    expect(headers.getSetCookie().join("\n")).toMatch(/session_token=;/);
    expect(
      await auth.api.getSession({ headers: new Headers({ cookie }) }),
    ).toBeNull();
  });
});

describe("disabled side doors", () => {
  it.each([
    [
      "/sign-up/email",
      { email: "x@example.com", password: "12345678", name: "X" },
    ],
    ["/sign-in/email-otp", { email: "x@example.com", otp: "123456" }],
    [
      "/email-otp/send-verification-otp",
      { email: "x@example.com", type: "sign-in" },
    ],
    ["/forget-password/email-otp", { email: "x@example.com" }],
    ["/request-password-reset", { email: "x@example.com" }],
  ])("%s is not reachable over HTTP", async (path, body) => {
    const response = await post(auth, path, body);

    expect(response.status).toBe(404);
    expect(sentMails).toHaveLength(0);
  });
});

describe("password reset", () => {
  it("resets the password with an emailed OTP (#324)", async () => {
    await createCredentialUser(auth.$context, USER);

    const request = await post(auth, "/email-otp/request-password-reset", {
      email: USER.email,
    });
    expect(request.status).toBe(200);
    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].to).toBe("member@example.com");
    const otp = sentMails[0].html.match(/>(\d{6})</)?.[1];
    expect(otp).toBeDefined();

    const reset = await post(auth, "/email-otp/reset-password", {
      email: USER.email,
      otp,
      password: "a brand new password",
    });
    expect(reset.status).toBe(200);

    const signIn = await post(auth, "/sign-in/email", {
      email: USER.email,
      password: "a brand new password",
    });
    expect(signIn.status).toBe(200);
  });

  it("answers an unknown email with the same success shape and sends nothing (enumeration)", async () => {
    const response = await post(auth, "/email-otp/request-password-reset", {
      email: "nobody@example.com",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(sentMails).toHaveLength(0);
  });

  it("mails a reset link to the Systemkonto redirect target via the server API (#363)", async () => {
    await createCredentialUser(auth.$context, USER);

    await auth.api.requestPasswordReset({
      body: {
        email: USER.email,
        redirectTo: `${BASE_URL}/passwort-vergessen/einloesen`,
      },
    });

    expect(sentMails).toHaveLength(1);
    expect(sentMails[0].html).toContain(`${BASE_URL}/api/auth/reset-password/`);
    expect(sentMails[0].html).toContain(
      encodeURIComponent(`${BASE_URL}/passwort-vergessen/einloesen`),
    );
  });
});
