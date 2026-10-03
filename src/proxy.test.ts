import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const getSessionMock = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: {
    api: { getSession: (...args: unknown[]) => getSessionMock(...args) },
  },
}));

const proxy = (await import("@/proxy")).default;

function makeRequest({
  pathname,
  nextAction = false,
  method = "GET",
}: {
  pathname: string;
  nextAction?: boolean;
  method?: string;
}) {
  const headers = new Headers();
  if (nextAction) headers.set("next-action", "60f00abcde1234567890");
  return new NextRequest(`http://localhost${pathname}`, { method, headers });
}

function sessionResult(
  session: unknown,
  setCookies: string[] = [],
): { headers: Headers; response: unknown } {
  const headers = new Headers();
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return { headers, response: session };
}

const VALID_SESSION = {
  session: { id: "s-1", createdAt: new Date() },
  user: { id: "user-1" },
};

describe("proxy CSP", () => {
  it("sets a report-only CSP with a nonce on a public route", async () => {
    const response = await proxy(makeRequest({ pathname: "/news" }));

    const csp = response.headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("forwards the nonce to the request so the layout can read it via headers()", async () => {
    let seenRequest: NextRequest | undefined;
    const originalNext = NextResponse.next.bind(NextResponse);
    vi.spyOn(NextResponse, "next").mockImplementation((init) => {
      seenRequest = init?.request as never;
      return originalNext(init);
    });

    await proxy(makeRequest({ pathname: "/news" }));

    expect(seenRequest?.headers.get("x-nonce")).toMatch(/^[A-Za-z0-9+/=]+$/);
    vi.restoreAllMocks();
  });

  it("generates a fresh nonce for every request", async () => {
    const first = await proxy(makeRequest({ pathname: "/news" }));
    const second = await proxy(makeRequest({ pathname: "/news" }));

    const cspFirst = first.headers.get("Content-Security-Policy-Report-Only");
    const cspSecond = second.headers.get("Content-Security-Policy-Report-Only");
    expect(cspFirst).not.toBe(cspSecond);
  });

  it("also sets the CSP on an authenticated protected-route response", async () => {
    getSessionMock.mockResolvedValue(sessionResult(VALID_SESSION));

    const response = await proxy(makeRequest({ pathname: "/admin/bestand" }));

    expect(
      response.headers.get("Content-Security-Policy-Report-Only"),
    ).toContain("default-src 'self'");
  });
});

describe("proxy", () => {
  it("never looks up a session on a public route (#242: no per-page-view session cost)", async () => {
    getSessionMock.mockClear();

    await proxy(makeRequest({ pathname: "/news" }));

    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("checks the session for a protected route with the request's own headers, refresh allowed", async () => {
    getSessionMock.mockResolvedValue(sessionResult(VALID_SESSION));
    const request = makeRequest({ pathname: "/admin/bestand" });

    await proxy(request);

    const [args] = getSessionMock.mock.calls.at(-1)!;
    expect(args.headers).toBe(request.headers);
    expect(args.returnHeaders).toBe(true);
    expect(args.query?.disableRefresh).toBeUndefined();
  });

  it("passes the refreshed session cookie through to the response", async () => {
    getSessionMock.mockResolvedValue(
      sessionResult(VALID_SESSION, [
        "better-auth.session_token=new; Path=/; HttpOnly; SameSite=Lax",
      ]),
    );

    const response = await proxy(makeRequest({ pathname: "/admin/bestand" }));

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toContain(
      "better-auth.session_token=new; Path=/; HttpOnly; SameSite=Lax",
    );
  });

  it("redirects a normal page navigation without a session to /login", async () => {
    getSessionMock.mockResolvedValue(sessionResult(null));

    const response = await proxy(makeRequest({ pathname: "/admin/bestand" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("never forwards a raw 3xx redirect for an unauthenticated Server Action request", async () => {
    // Next.js's server-action client (server-action-reducer.js) only recognises a
    // response as a redirect via the `x-action-redirect` header. A plain 3xx
    // Location redirect is neither that nor a `text/x-component` RSC response,
    // so the client throws "An unexpected response was received from the
    // server" (Next error code E394) instead of showing a comprehensible message.
    getSessionMock.mockResolvedValue(sessionResult(null));

    const response = await proxy(
      makeRequest({
        pathname: "/admin/bestand",
        nextAction: true,
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets an authenticated Server Action POST through", async () => {
    // Regression guard for the old @neondatabase/auth bug (0.4.2-beta), where
    // a POST was proxied upstream as POST to a GET-only endpoint and a valid
    // session counted as logged-out. The session lookup is method-agnostic now.
    getSessionMock.mockResolvedValue(sessionResult(VALID_SESSION));

    const response = await proxy(
      makeRequest({
        pathname: "/admin/news/new",
        nextAction: true,
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
