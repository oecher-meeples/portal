import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MeepleQrDialog } from "@/components/layout/meeple-qr-dialog";

const toDataURLMock = vi.fn();
vi.mock("qrcode", () => ({
  default: { toDataURL: (...args: unknown[]) => toDataURLMock(...args) },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MeepleQrDialog (#465)", () => {
  it("encodes the Meeple's own OM-MEEPLE code once opened", async () => {
    toDataURLMock.mockResolvedValue("data:image/png;base64,abc");

    render(<MeepleQrDialog meepleId="meeple-1" open onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(toDataURLMock).toHaveBeenCalledWith(
        "OM-MEEPLE-meeple-1",
        expect.objectContaining({ width: 240 }),
      );
    });
    expect(
      await screen.findByAltText("Mein persönlicher QR-Code"),
    ).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("does not generate a code while closed", () => {
    render(
      <MeepleQrDialog
        meepleId="meeple-1"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(toDataURLMock).not.toHaveBeenCalled();
  });
});
