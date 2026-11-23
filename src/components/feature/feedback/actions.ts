"use server";

import { requireMeeple } from "@/lib/members/meeples";
import {
  createFeedbackSubIssue,
  GithubApiError,
} from "@/lib/feedback/github-client";

/** Präfix macht in der Issue-Liste auf einen Blick klar: extern über den
 * Feedback-Button eingereicht, nicht intern von einer Mitwirkenden angelegt. */
const FEEDBACK_TITLE_PREFIX = "[Feedback]";

/** Der GitHub-Issue-Autor ist technisch immer der Owner des `GITHUB_TOKEN`,
 * nicht das einreichende Meeple — die Präambel macht die echte Herkunft im
 * Body sichtbar. */
function buildFeedbackBody(displayName: string, message: string): string {
  return `> Über den Feedback-Button auf der Website eingereicht von ${displayName}.\n\n${message}`;
}

/** Käfer-Icon im Header (#282) — jeder eingeloggte Meeple darf Feedback
 * einreichen, kein zusätzliches Permission-Gate. */
export async function submitFeedback(subject: string, body: string) {
  const meeple = await requireMeeple();

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  if (!trimmedSubject) {
    return { error: "Bitte einen Betreff angeben." };
  }
  if (!trimmedBody) {
    return { error: "Bitte eine Nachricht angeben." };
  }

  try {
    await createFeedbackSubIssue(
      `${FEEDBACK_TITLE_PREFIX} ${trimmedSubject}`,
      buildFeedbackBody(meeple.displayName, trimmedBody),
    );
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
