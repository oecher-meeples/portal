import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const routerPushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

const createPostMock = vi.fn();
const updatePostMock = vi.fn();
vi.mock("@/components/feature/admin-news/actions", () => ({
  createPost: (...args: unknown[]) => createPostMock(...args),
  updatePost: (...args: unknown[]) => updatePostMock(...args),
  getUploadToken: vi.fn(),
  retryInstagramPost: vi.fn(),
}));

const { PostForm } = await import("./post-form");

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Titel"), "Sommerfest");
  await user.type(screen.getByLabelText("Datum"), "2026-08-01");
  await user.type(screen.getByLabelText("Inhalt (Markdown)"), "Es war toll.");
}

describe("PostForm", () => {
  it("navigates back to the post list on success", async () => {
    const user = userEvent.setup();
    createPostMock.mockResolvedValue({ success: true, id: "post-1" });

    render(<PostForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Beitrag erstellen" }));

    expect(createPostMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith("/admin/news");
  });

  it("shows the server error instead of crashing when the session has expired", async () => {
    const user = userEvent.setup();
    createPostMock.mockRejectedValue(
      new Error(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    );

    render(<PostForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Beitrag erstellen" }));

    expect(
      await screen.findByText(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    ).toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });
});
