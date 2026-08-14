import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";

vi.mock("@/components/ui/code-scanner", () => ({
  CodeScanner: ({ onDetected }: { onDetected: (text: string) => void }) => (
    <button type="button" onClick={() => onDetected("4001504311892")}>
      simulate-detect
    </button>
  ),
}));

describe("ScanSearchDialog", () => {
  it("opens the dialog on click, reports the scanned text and closes", async () => {
    vi.useFakeTimers();
    const onScanned = vi.fn();
    render(<ScanSearchDialog onScanned={onScanned} />);

    fireEvent.click(screen.getByRole("button", { name: "Scannen" }));
    expect(screen.getByText("Code scannen")).toBeInTheDocument();

    fireEvent.click(screen.getByText("simulate-detect"));
    expect(onScanned).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    vi.useRealTimers();

    await waitFor(() => {
      expect(onScanned).toHaveBeenCalledWith("4001504311892");
    });
    await waitFor(() => {
      expect(screen.queryByText("Code scannen")).not.toBeInTheDocument();
    });
  });
});
