import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { BulkScanDialog } from "@/components/ui/bulk-scan-dialog";

afterEach(() => {
  cleanup();
});

vi.mock("@/components/ui/code-scanner", () => ({
  CodeScanner: ({ onDetected }: { onDetected: (text: string) => void }) => (
    <div>
      <button type="button" onClick={() => onDetected("4001504311896")}>
        simulate-detect-1
      </button>
      <button type="button" onClick={() => onDetected("4260402312019")}>
        simulate-detect-2
      </button>
    </div>
  ),
}));

describe("BulkScanDialog", () => {
  it("reports every detected code without closing the dialog", () => {
    const onDetected = vi.fn();
    render(<BulkScanDialog onDetected={onDetected} />);

    fireEvent.click(screen.getByRole("button", { name: "Scannen" }));
    expect(screen.getByText("EANs scannen")).toBeInTheDocument();
    expect(screen.getByText("Noch nichts gescannt.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("simulate-detect-1"));
    fireEvent.click(screen.getByText("simulate-detect-2"));

    expect(onDetected).toHaveBeenNthCalledWith(1, "4001504311896");
    expect(onDetected).toHaveBeenNthCalledWith(2, "4260402312019");
    expect(screen.getByText("2 Codes gescannt.")).toBeInTheDocument();
    expect(screen.getByText("EANs scannen")).toBeInTheDocument();
  });

  it("closes on 'Fertig' and resets the count for the next open", () => {
    const onDetected = vi.fn();
    render(<BulkScanDialog onDetected={onDetected} />);

    fireEvent.click(screen.getByRole("button", { name: "Scannen" }));
    fireEvent.click(screen.getByText("simulate-detect-1"));
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));

    expect(screen.queryByText("EANs scannen")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Scannen" }));
    expect(screen.getByText("Noch nichts gescannt.")).toBeInTheDocument();
  });
});
