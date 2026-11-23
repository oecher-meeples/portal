import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveMemberByCalendarTokenMock = vi.fn();
vi.mock("@/lib/members/calendar-token", () => ({
  resolveMemberByCalendarToken: (...args: unknown[]) =>
    resolveMemberByCalendarTokenMock(...args),
}));

const fetchRawIcsTextMock = vi.fn();
vi.mock("@/lib/content/calendar", () => ({
  fetchRawIcsText: (...args: unknown[]) => fetchRawIcsTextMock(...args),
}));

const { GET } = await import("./route");

function request(token: string) {
  return GET(
    new Request(`https://example.com/api/calendar/internal/${token}`),
    {
      params: Promise.resolve({ token }),
    },
  );
}

beforeEach(() => {
  resolveMemberByCalendarTokenMock.mockReset();
  fetchRawIcsTextMock.mockReset();
});

describe("GET /api/calendar/internal/[token] (#438)", () => {
  it("returns 404 for an unknown or revoked token, without ever fetching the real feed", async () => {
    resolveMemberByCalendarTokenMock.mockResolvedValue(null);

    const response = await request("unknown-token.ics");

    expect(response.status).toBe(404);
    expect(fetchRawIcsTextMock).not.toHaveBeenCalled();
  });

  it("strips a trailing .ics suffix before resolving the token", async () => {
    resolveMemberByCalendarTokenMock.mockResolvedValue({ id: "member-1" });
    fetchRawIcsTextMock.mockResolvedValue("BEGIN:VCALENDAR\nEND:VCALENDAR");

    await request("abc123.ics");

    expect(resolveMemberByCalendarTokenMock).toHaveBeenCalledWith("abc123");
  });

  it("returns the raw ICS feed as text/calendar for a valid token", async () => {
    resolveMemberByCalendarTokenMock.mockResolvedValue({ id: "member-1" });
    fetchRawIcsTextMock.mockResolvedValue("BEGIN:VCALENDAR\nEND:VCALENDAR");

    const response = await request("abc123.ics");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(body).toBe("BEGIN:VCALENDAR\nEND:VCALENDAR");
  });

  it("returns 502 when the upstream feed is unavailable, for an otherwise valid token", async () => {
    resolveMemberByCalendarTokenMock.mockResolvedValue({ id: "member-1" });
    fetchRawIcsTextMock.mockResolvedValue(null);

    const response = await request("abc123.ics");

    expect(response.status).toBe(502);
  });
});
