import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CopyIcon } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

// `userEvent.click` triggers a real jsdom navigation as a side effect of its
// pointer-event sequence, which tears down and replaces `navigator` (and thus
// any `navigator.clipboard` stub) mid-click — the same class of jsdom gap
// documented for `DataTransfer` in role-permissions-editor.test.tsx. `fireEvent`
// dispatches the click directly and sidesteps it.
const writeTextMock = vi.fn().mockResolvedValue(undefined);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.stubGlobal("navigator", {
  ...navigator,
  clipboard: { writeText: writeTextMock },
});

describe("CopyButton", () => {
  it("copies a plain string value directly", async () => {
    render(<CopyButton value="1234" label="Kopieren" icon={CopyIcon} />);

    fireEvent.click(screen.getByRole("button", { name: "Kopieren" }));

    expect(await screen.findByText("Kopiert!")).toBeInTheDocument();
    expect(writeTextMock).toHaveBeenCalledWith("1234");
  });

  it("resolves a lazy reveal() before copying (#356)", async () => {
    const reveal = vi.fn().mockResolvedValue({ success: true, value: "5678" });
    render(<CopyButton value={reveal} label="Kopieren" icon={CopyIcon} />);

    fireEvent.click(screen.getByRole("button", { name: "Kopieren" }));

    expect(await screen.findByText("Kopiert!")).toBeInTheDocument();
    expect(reveal).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith("5678");
  });

  it("surfaces a reveal error via onError instead of copying", async () => {
    const reveal = vi.fn().mockResolvedValue({ error: "Zu viele Abrufe." });
    const onError = vi.fn();
    render(
      <CopyButton
        value={reveal}
        label="Kopieren"
        icon={CopyIcon}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Kopieren" }));

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Zu viele Abrufe."));
    expect(writeTextMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Kopiert!")).toBeNull();
  });
});
