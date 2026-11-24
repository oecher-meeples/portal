import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MemberImportPreview } from "@/lib/members/member-import-types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const previewMemberImportMock = vi.fn();
const commitMemberImportMock = vi.fn();
vi.mock(
  "@/components/feature/admin-mitglieder-import/member-import-actions",
  () => ({
    previewMemberImport: (...args: unknown[]) =>
      previewMemberImportMock(...args),
    commitMemberImport: (...args: unknown[]) => commitMemberImportMock(...args),
  }),
);

const { MemberImportView } = await import("./member-import-view");

const CSV = [
  "mitglied_email;mitglied_name;mitglied_vorname;mitglied_nr",
  "fam@example.com;Muster;Mutter;OEMe.V.001",
  "fam@example.com;Muster;Kind;OEMe.V.002",
  "",
].join("\r\n");

const PREVIEW: MemberImportPreview = {
  rows: [
    {
      line: 2,
      memberNumber: 1,
      firstName: "Mutter",
      lastName: "Muster",
      email: "fam@example.com",
      status: "group",
      message: null,
    },
    {
      line: 3,
      memberNumber: 2,
      firstName: "Kind",
      lastName: "Muster",
      email: "fam@example.com",
      status: "group",
      message: null,
    },
  ],
  groups: [{ email: "fam@example.com", lines: [2, 3], anchor: null }],
  emailOwners: {},
  existingGuardianOptions: [],
};

function upload() {
  const file = new File([CSV], "Mitglieder.csv", { type: "text/csv" });
  // jsdom kennt `File.arrayBuffer()` nicht in jeder Version.
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new TextEncoder().encode(CSV).buffer),
  });
  fireEvent.change(document.getElementById("member-import-file")!, {
    target: { files: [file] },
  });
}

beforeEach(() => {
  previewMemberImportMock
    .mockReset()
    .mockResolvedValue({ success: true, value: PREVIEW });
  commitMemberImportMock
    .mockReset()
    .mockResolvedValue({ success: true, value: { created: 2 } });
});

afterEach(cleanup);

describe("MemberImportView (#611)", () => {
  it("sends only parsed rows, blocks until roles are chosen, then commits", async () => {
    const user = userEvent.setup();
    render(<MemberImportView />);

    upload();

    await screen.findByText("Offene Entscheidungen");
    expect(previewMemberImportMock).toHaveBeenCalledWith([
      expect.objectContaining({
        line: 2,
        memberNumber: 1,
        firstName: "Mutter",
      }),
      expect.objectContaining({ line: 3, memberNumber: 2, firstName: "Kind" }),
    ]);
    const submit = screen.getByRole("button", { name: "2 Mitglieder anlegen" });
    expect(submit).toBeDisabled();

    const [mutterToGuardians] = screen.getAllByRole("button", {
      name: "Erziehungsberechtigt",
    });
    await user.click(mutterToGuardians);
    // Einzige:r Erziehungsberechtigte:r behält die Adresse ohne Rückfrage.
    expect(
      within(
        screen.getByRole("region", { name: "Erziehungsberechtigte" }),
      ).getByText("Behält fam@example.com"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Kind" }));

    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getByText("2 Mitglied(er) angelegt.")).toBeInTheDocument(),
    );
    expect(commitMemberImportMock).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        2: expect.objectContaining({ role: "adult" }),
        3: expect.objectContaining({ role: "child" }),
      }),
    );
  });

  it("pre-selects the guardian whose first name is in the address", async () => {
    previewMemberImportMock.mockResolvedValue({
      success: true,
      value: {
        ...PREVIEW,
        rows: PREVIEW.rows.map((row) => ({
          ...row,
          email: "mutter.muster@example.com",
        })),
        groups: [
          { email: "mutter.muster@example.com", lines: [2, 3], anchor: null },
        ],
      },
    });
    render(<MemberImportView />);

    upload();

    const guardians = await screen.findByRole("region", {
      name: "Erziehungsberechtigte",
    });
    expect(within(guardians).getByText("Mutter Muster")).toBeInTheDocument();
    expect(
      within(guardians).getByText("Vorschlag aus E-Mail"),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Nicht zugewiesen" }),
      ).getByText("Kind Muster"),
    ).toBeInTheDocument();
  });

  it("excludes a person from the import and can bring them back", async () => {
    const user = userEvent.setup();
    render(<MemberImportView />);

    upload();

    await user.click(
      await screen.findByRole("button", {
        name: "Kind Muster nicht importieren",
      }),
    );
    const skipped = screen.getByRole("region", {
      name: "Nicht importieren (1)",
    });
    expect(within(skipped).getByText("Kind Muster")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "1 Mitglieder anlegen" }),
    ).toBeInTheDocument();

    await user.click(
      within(skipped).getByRole("button", { name: /Doch importieren/ }),
    );
    expect(
      screen.getByRole("button", { name: "2 Mitglieder anlegen" }),
    ).toBeInTheDocument();
  });

  it("shows the server error and no preview", async () => {
    previewMemberImportMock.mockResolvedValue({ error: "Kein Zugriff." });
    render(<MemberImportView />);

    upload();

    expect(await screen.findByText("Kein Zugriff.")).toBeInTheDocument();
    expect(screen.queryByText("Offene Entscheidungen")).not.toBeInTheDocument();
  });
});
