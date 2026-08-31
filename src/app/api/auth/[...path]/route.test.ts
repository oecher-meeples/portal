import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upstreamGet = vi.fn();
const upstreamPost = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  auth: { handler: () => ({ GET: upstreamGet, POST: upstreamPost }) },
}));

const checkFixedCooldownMock = vi.fn();
const checkLoginBackoffMock = vi.fn();
const recordLoginFailureMock = vi.fn();
const resetLoginBackoffIfSameIpMock = vi.fn();
vi.mock("@/lib/utils/rate-limit", () => ({
  checkFixedCooldown: (...args: unknown[]) => checkFixedCooldownMock(...args),
  checkLoginBackoff: (...args: unknown[]) => checkLoginBackoffMock(...args),
  recordLoginFailure: (...args: unknown[]) => recordLoginFailureMock(...args),
  resetLoginBackoffIfSameIp: (...args: unknown[]) =>
    resetLoginBackoffIfSameIpMock(...args),
}));

const getRequestIpMock = vi.fn();
vi.mock("@/lib/utils/request-ip", () => ({
  getRequestIp: () => getRequestIpMock(),
}));

const { POST } = await import("./route");

const CONTEXT = { params: Promise.resolve({ path: ["sign-in", "email"] }) };

function signInRequest(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/auth/sign-in/email", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  checkFixedCooldownMock.mockResolvedValue({ allowed: true });
  checkLoginBackoffMock.mockResolvedValue({ allowed: true });
  getRequestIpMock.mockResolvedValue("1.2.3.4");
  upstreamPost.mockResolvedValue(new Response(null, { status: 200 }));
});

describe("POST /api/auth/sign-in/email", () => {
  it("forwards non-login paths untouched, without any rate-limit check", async () => {
    const request = new NextRequest(
      "https://example.com/api/auth/get-session",
      { method: "POST" },
    );
    const context = { params: Promise.resolve({ path: ["get-session"] }) };

    await POST(request, context);

    expect(upstreamPost).toHaveBeenCalledWith(request, context);
    expect(checkFixedCooldownMock).not.toHaveBeenCalled();
  });

  it("blocks the request when the IP cooldown is still running", async () => {
    checkFixedCooldownMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 2,
    });

    const response = await POST(
      signInRequest({ email: "a@b.de", password: "x" }),
      CONTEXT,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
    });
    expect(upstreamPost).not.toHaveBeenCalled();
  });

  it("blocks the request while the email backoff cooldown is running — same generic error as wrong credentials", async () => {
    checkLoginBackoffMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 60,
    });

    const response = await POST(
      signInRequest({ email: "a@b.de", password: "x" }),
      CONTEXT,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
    });
    expect(upstreamPost).not.toHaveBeenCalled();
  });

  it("records a failure and forwards the upstream response on a rejected login", async () => {
    upstreamPost.mockResolvedValue(new Response(null, { status: 401 }));

    const response = await POST(
      signInRequest({ email: "A@B.de", password: "wrong" }),
      CONTEXT,
    );

    expect(response.status).toBe(401);
    expect(recordLoginFailureMock).toHaveBeenCalledWith(
      "login:email:a@b.de",
      "1.2.3.4",
    );
    expect(resetLoginBackoffIfSameIpMock).not.toHaveBeenCalled();
  });

  it("resets the backoff on a successful login", async () => {
    const response = await POST(
      signInRequest({ email: "A@B.de", password: "right" }),
      CONTEXT,
    );

    expect(response.status).toBe(200);
    expect(resetLoginBackoffIfSameIpMock).toHaveBeenCalledWith(
      "login:email:a@b.de",
      "1.2.3.4",
    );
    expect(recordLoginFailureMock).not.toHaveBeenCalled();
  });

  it("blocks a forget-password request while its IP cooldown is running, with the same generic success shape", async () => {
    checkFixedCooldownMock.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 30,
    });
    const request = new NextRequest(
      "https://example.com/api/auth/forget-password/email-otp",
      { method: "POST", body: JSON.stringify({ email: "a@b.de" }) },
    );
    const context = {
      params: Promise.resolve({ path: ["forget-password", "email-otp"] }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(upstreamPost).not.toHaveBeenCalled();
  });

  it("forwards a forget-password request once the cooldown has elapsed", async () => {
    const request = new NextRequest(
      "https://example.com/api/auth/forget-password/email-otp",
      { method: "POST", body: JSON.stringify({ email: "a@b.de" }) },
    );
    const context = {
      params: Promise.resolve({ path: ["forget-password", "email-otp"] }),
    };

    await POST(request, context);

    expect(upstreamPost).toHaveBeenCalledWith(request, context);
  });

  it("still applies the IP cooldown even when the body carries no email", async () => {
    const request = new NextRequest(
      "https://example.com/api/auth/sign-in/email",
      { method: "POST", body: "not json" },
    );

    const response = await POST(request, CONTEXT);

    expect(response.status).toBe(200);
    expect(recordLoginFailureMock).not.toHaveBeenCalled();
    expect(resetLoginBackoffIfSameIpMock).not.toHaveBeenCalled();
  });
});
