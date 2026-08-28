"use server";

import { requireMeeple } from "@/lib/members/meeples";
import {
  createFeedbackSubIssue,
  GithubApiError,
} from "@/lib/feedback/github-client";

/** Käfer-Icon im Header (#282) — jeder eingeloggte Meeple darf Feedback
 * einreichen, kein zusätzliches Permission-Gate. */
export async function submitFeedback(subject: string, body: string) {
  await requireMeeple();

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) {
    return { error: "Bitte einen Betreff angeben." };
  }
  if (!trimmedBody) {
    return { error: "Bitte eine Nachricht angeben." };
  }

  try {
    await createFeedbackSubIssue(trimmedSubject, trimmedBody);
    return { success: true as const };
  } catch (error) {
    if (error instanceof GithubApiError) {
      return {
        error:
          "Feedback konnte nicht übermittelt werden. Bitte später erneut versuchen.",
      };
    }
    throw error;
  }
}
