import { requireEnv } from "@/lib/utils/require-env";

const GITHUB_API_BASE = "https://api.github.com";
const FEEDBACK_REPO_OWNER = "oecher-meeples";
const FEEDBACK_REPO_NAME = "portal";
/** Epic: Feedback — jedes eingereichte Feedback wird darunter als
 * Sub-Issue eingehängt (#282). */
const FEEDBACK_EPIC_ISSUE_NUMBER = 281;
const FETCH_TIMEOUT_MS = 8000;

export class GithubApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GithubApiError";
    this.status = status;
  }
}

async function githubFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${requireEnv("GITHUB_TOKEN")}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GithubApiError(
        "Die Anfrage an die GitHub API hat zu lange gedauert.",
      );
    }
    throw error;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  if (!response.ok) {
    throw new GithubApiError(
      body.message ?? `GitHub API request failed (${response.status})`,
      response.status,
    );
  }
  return body;
}

/**
 * Legt ein neues GitHub-Issue an und hängt es per GitHub-Sub-Issues-API
 * (REST, seit 2025 verfügbar) als Sub-Issue an das Feedback-Epic (#281) —
 * Titel = Betreff, Body = Freitext des Meeples (#282).
 */
export async function createFeedbackSubIssue(
  title: string,
  body: string,
): Promise<{ number: number; url: string }> {
  const created = await parseJsonOrThrow<{
    id: number;
    number: number;
    html_url: string;
  }>(
    await githubFetch(
      `/repos/${FEEDBACK_REPO_OWNER}/${FEEDBACK_REPO_NAME}/issues`,
      { method: "POST", body: JSON.stringify({ title, body }) },
    ),
  );

  await parseJsonOrThrow(
    await githubFetch(
      `/repos/${FEEDBACK_REPO_OWNER}/${FEEDBACK_REPO_NAME}/issues/${FEEDBACK_EPIC_ISSUE_NUMBER}/sub_issues`,
      {
        method: "POST",
        body: JSON.stringify({ sub_issue_id: created.id }),
      },
    ),
  );

  return { number: created.number, url: created.html_url };
}
