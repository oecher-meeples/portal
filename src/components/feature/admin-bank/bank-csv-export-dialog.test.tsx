import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const exportBankDataCsvMock = vi.fn();
vi.mock("@/components/feature/admin-bank/actions", () => ({
  exportBankDataCsv: (...args: unknown[]) => exportBankDataCsvMock(...args),
}));

const { BankCsvExportDialog } = await import("./bank-csv-export-dialog");

const clickMock = vi.fn();

beforeEach(() => {
  exportBankDataCsvMock.mockResolvedValue({
    success: true,
    filename: "beitragseinzug.csv",
    csv: "a;b",
    rowCount: 3,
  });
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  clickMock.mockReset();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickMock);
});

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "CSV für die Banking-Software" }),
  );
  return screen.findByRole("dialog");
}

describe("BankCsvExportDialog", () => {
  it("does not export until the warning is confirmed", async () => {
    const user = userEvent.setup();
    render(<BankCsvExportDialog ibanCount={3} />);

    await openDialog(user);

    expect(exportBankDataCsvMock).not.toHaveBeenCalled();
  });

  it("names the number of plaintext IBANs and the deletion duty", async () => {
    const user = userEvent.setup();
    render(<BankCsvExportDialog ibanCount={3} />);

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("3 vollständige, unverschlüsselte IBANs");
    expect(dialog).toHaveTextContent(/wieder löschen/);
    expect(dialog).toHaveTextContent(/protokolliert/);
  });

  it("uses the singular for a single IBAN", async () => {
    const user = userEvent.setup();
    render(<BankCsvExportDialog ibanCount={1} />);

    const dialog = await openDialog(user);

    expect(dialog).toHaveTextContent("1 vollständige, unverschlüsselte IBAN");
  });

  it("exports and downloads only after confirmation", async () => {
    const user = userEvent.setup();
    render(<BankCsvExportDialog ibanCount={3} />);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: /Export/ }));

    expect(exportBankDataCsvMock).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
  });

  it("shows the action error and downloads nothing when the export is refused", async () => {
    exportBankDataCsvMock.mockResolvedValue({ error: "Keine Berechtigung." });
    const user = userEvent.setup();
    render(<BankCsvExportDialog ibanCount={3} />);

    const dialog = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: /Export/ }));

    expect(await screen.findByText("Keine Berechtigung.")).toBeInTheDocument();
    expect(clickMock).not.toHaveBeenCalled();
  });

  it("disables the trigger when there is nothing to export", () => {
    render(<BankCsvExportDialog ibanCount={0} />);

    expect(
      screen.getByRole("button", { name: "CSV für die Banking-Software" }),
    ).toBeDisabled();
  });
});
