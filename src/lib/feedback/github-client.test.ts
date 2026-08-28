import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GithubApiError,
  createFeedbackSubIssue,
} from "@/lib/feedback/github-client";

function mockFetchSequence(
  responses: { ok: boolean; status?: number; body: unknown }[],
) {
  const fetchMock = vi.fn();
  for (const response of responses) {
    fetchMock.mockResolvedValueOnce({
      ok: response.ok,
      status: response.status ?? (response.ok ? 201 : 400),
      json: async () => response.body,
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("createFeedbackSubIssue", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GITHUB_TOKEN;
  });

  it("creates the issue and attaches it as a sub-issue of the Feedback epic (#281)", async () => {
    const fetchMock = mockFetchSequence([
      {
        ok: true,
        body: {
          id: 999,
          number: 320,
          html_url: "https://github.com/oecher-meeples/portal/issues/320",
        },
      },
      { ok: true, body: {} },
    ]);

    const result = await createFeedbackSubIssue(
      "Buttons zu klein",
      "Auf dem Handy kaum klickbar.",
    );

    expect(result).toEqual({
      number: 320,
      url: "https://github.com/oecher-meeples/portal/issues/320",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.github.com/repos/oecher-meeples/portal/issues",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Buttons zu klein",
          body: "Auf dem Handy kaum klickbar.",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.github.com/repos/oecher-meeples/portal/issues/281/sub_issues",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sub_issue_id: 999 }),
      }),
    );
  });

  it("throws a GithubApiError with the API's message when issue creation fails", async () => {
    mockFetchSequence([
      { ok: false, status: 422, body: { message: "Validation failed" } },
    ]);

    await expect(createFeedbackSubIssue("Titel", "Text")).rejects.toThrow(
      GithubApiError,
    );
  });

  it("translates a fetch timeout into a readable GithubApiError", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(createFeedbackSubIssue("Titel", "Text")).rejects.toThrow(
      "Die Anfrage an die GitHub API hat zu lange gedauert.",
    );
  });
});
