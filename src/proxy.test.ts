import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const middlewareMock = vi.fn();

vi.mock("@/lib/auth/server", () => ({
  auth: { middleware: () => middlewareMock },
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

describe("proxy CSP", () => {
  it("sets a report-only CSP with a nonce on a public route", async () => {
    const response = await proxy(makeRequest({ pathname: "/news" }));

    const csp = response.headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
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
    middlewareMock.mockResolvedValue(NextResponse.next());

    const response = await proxy(makeRequest({ pathname: "/admin/bestand" }));

    expect(
      response.headers.get("Content-Security-Policy-Report-Only"),
    ).toContain("default-src 'self'");
  });

  it("falls back to a placeholder origin when NEON_AUTH_BASE_URL is unset, instead of throwing", async () => {
    // Assigning `undefined` to process.env stringifies to "undefined" and
    // would poison every later test's URL parsing — delete instead of restore.
    const original = process.env.NEON_AUTH_BASE_URL;
    delete process.env.NEON_AUTH_BASE_URL;

    const response = await proxy(makeRequest({ pathname: "/news" }));

    expect(
      response.headers.get("Content-Security-Policy-Report-Only"),
    ).toContain("connect-src 'self'");

    if (original !== undefined) process.env.NEON_AUTH_BASE_URL = original;
  });
});

describe("proxy", () => {
  it("passes through a plain redirect for a normal page navigation to a protected route", async () => {
    middlewareMock.mockResolvedValue(
      NextResponse.redirect(new URL("http://localhost/login")),
    );

    const response = await proxy(makeRequest({ pathname: "/admin/bestand" }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("never forwards a raw 3xx redirect for an unauthenticated Server Action request", async () => {
    // Next.js's server-action client (server-action-reducer.js) only recognises a
    // response as a redirect via the `x-action-redirect` header. A plain 3xx
    // Location redirect (what @neondatabase/auth's `redirect_login` branch returns)
    // is neither that nor a `text/x-component` RSC response, so the client throws
    // "An unexpected response was received from the server" (Next error code E394)
    // instead of showing a comprehensible message.
    middlewareMock.mockResolvedValue(
      NextResponse.redirect(new URL("http://localhost/login")),
    );

    const response = await proxy(
      makeRequest({
        pathname: "/admin/bestand",
        nextAction: true,
        method: "POST",
      }),
    );

    const isRedirect = response.status >= 300 && response.status < 400;
    expect(isRedirect).toBe(false);
    expect(response.headers.get("location")).toBeNull();
  });

  it("always probes the auth middleware with GET, regardless of the request's own method", async () => {
    // Regression test for a @neondatabase/auth bug (0.4.2-beta): its
    // middleware proxies the get-session check upstream using the original
    // request's method. Neon Auth's get-session endpoint only accepts GET,
    // so a POST/HEAD request (e.g. a Server Action submit) was always
    // treated as unauthenticated, even with a valid session cookie.
    middlewareMock.mockResolvedValue(NextResponse.next());

    await proxy(
      makeRequest({
        pathname: "/admin/news/new",
        nextAction: true,
        method: "POST",
      }),
    );

    const probeRequest = middlewareMock.mock.calls.at(-1)?.[0];
    expect(probeRequest.method).toBe("GET");
    expect(probeRequest.nextUrl.pathname).toBe("/admin/news/new");
  });
});
