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
      makeRequest({ pathname: "/admin/bestand", nextAction: true, method: "POST" }),
    );

    const isRedirect = response.status >= 300 && response.status < 400;
    expect(isRedirect).toBe(false);
    expect(response.headers.get("location")).toBeNull();
  });
});
