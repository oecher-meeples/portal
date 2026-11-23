import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { EventPostExistenceGuard } from "./event-post-existence-guard";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

const verifyLinkedEventOrUnpublishMock = vi.fn();
vi.mock("@/components/feature/news/actions", () => ({
  verifyLinkedEventOrUnpublish: (...args: unknown[]) =>
    verifyLinkedEventOrUnpublishMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventPostExistenceGuard (#463)", () => {
  it("renders nothing visible", () => {
    verifyLinkedEventOrUnpublishMock.mockResolvedValue({ stillExists: true });

    const { container } = render(<EventPostExistenceGuard postId="post-1" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("checks the given post id", () => {
    verifyLinkedEventOrUnpublishMock.mockResolvedValue({ stillExists: true });

    render(<EventPostExistenceGuard postId="post-1" />);

    expect(verifyLinkedEventOrUnpublishMock).toHaveBeenCalledWith("post-1");
  });

  it("stays put when the linked event still exists", async () => {
    verifyLinkedEventOrUnpublishMock.mockResolvedValue({ stillExists: true });

    render(<EventPostExistenceGuard postId="post-1" />);

    await waitFor(() => {
      expect(verifyLinkedEventOrUnpublishMock).toHaveBeenCalled();
    });
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to /news once the check reports the event is gone", async () => {
    verifyLinkedEventOrUnpublishMock.mockResolvedValue({ stillExists: false });

    render(<EventPostExistenceGuard postId="post-1" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/news");
    });
  });
});
