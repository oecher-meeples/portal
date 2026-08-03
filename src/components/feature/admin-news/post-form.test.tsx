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
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    expect(createPostMock).toHaveBeenCalledTimes(1);
    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "PUBLISHED" }),
    );
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
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    expect(
      await screen.findByText(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
      ),
    ).toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("saves as draft with status DRAFT when the draft button is clicked", async () => {
    const user = userEvent.setup();
    createPostMock.mockResolvedValue({ success: true, id: "post-1" });

    render(<PostForm />);
    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("button", { name: "Als Entwurf speichern" }),
    );

    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DRAFT" }),
    );
  });

  it("shows the draft-copy checkbox only when editing an existing draft", async () => {
    render(
      <PostForm
        postId="post-1"
        initialValues={{ title: "Entwurf", status: "DRAFT" }}
      />,
    );

    expect(screen.getByText("Entwurf kopieren?")).toBeInTheDocument();
  });

  it("does not show the draft-copy checkbox for an already published post", async () => {
    render(
      <PostForm
        postId="post-1"
        initialValues={{ title: "Veröffentlicht", status: "PUBLISHED" }}
      />,
    );

    expect(screen.queryByText("Entwurf kopieren?")).not.toBeInTheDocument();
  });

  it("creates a copy via createPost instead of updating when 'Entwurf kopieren?' is checked", async () => {
    const user = userEvent.setup();
    createPostMock.mockResolvedValue({ success: true, id: "post-2" });

    render(
      <PostForm
        postId="post-1"
        initialValues={{
          title: "Entwurf",
          date: "2026-08-01",
          body: "Es war toll.",
          status: "DRAFT",
        }}
      />,
    );
    await user.click(
      screen.getByRole("checkbox", { name: /Entwurf kopieren/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Als Entwurf speichern" }),
    );

    expect(createPostMock).toHaveBeenCalledTimes(1);
    expect(updatePostMock).not.toHaveBeenCalled();
  });

  it("defaults the newsletter category from the post type and sends it along when checked", async () => {
    const user = userEvent.setup();
    createPostMock.mockResolvedValue({ success: true, id: "post-1" });

    render(<PostForm />);
    await fillRequiredFields(user);
    await user.click(
      screen.getByRole("checkbox", { name: "Als Newsletter versenden in" }),
    );
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendAsNewsletter: true,
        newsletterCategory: "NEWS",
      }),
    );
  });

  it("sends newsletterCategory as null when the newsletter checkbox is unchecked", async () => {
    const user = userEvent.setup();
    createPostMock.mockResolvedValue({ success: true, id: "post-1" });

    render(<PostForm />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Absenden" }));

    expect(createPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sendAsNewsletter: false,
        newsletterCategory: null,
      }),
    );
  });
});
