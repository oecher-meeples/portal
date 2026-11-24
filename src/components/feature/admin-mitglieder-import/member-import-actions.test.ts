import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { UserFacingError } from "@/lib/utils/action-result";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/action-guards", async () =>
  (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom((...args) =>
    requirePermissionMock(...args),
  ),
);

const buildImportPreviewMock = vi.fn();
vi.mock("@/lib/members/member-import-preview", () => ({
  buildImportPreview: (...args: unknown[]) => buildImportPreviewMock(...args),
}));

const commitMemberImportRecordMock = vi.fn();
vi.mock("@/lib/members/member-import-commit", () => ({
  commitMemberImport: (...args: unknown[]) =>
    commitMemberImportRecordMock(...args),
  withImportErrorHandling: (run: () => Promise<unknown>) => run(),
}));

const { previewMemberImport, commitMemberImport } =
  await import("./member-import-actions");

class ForbiddenError extends Error {}

const ROW = {
  line: 2,
  memberNumber: 76,
  firstName: "Erika",
  lastName: "Musterfrau",
  email: "erika@example.com",
};
const DECISIONS = {
  2: {
    role: "adult" as const,
    email: "erika@example.com",
    noEmail: false,
    keepsSharedEmail: false,
    linkMeeple: false,
    family: null,
    skip: false,
  },
};

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-user" });
  buildImportPreviewMock.mockReset().mockResolvedValue({ rows: [] });
  commitMemberImportRecordMock.mockReset().mockResolvedValue({ created: 1 });
  vi.mocked(revalidatePath).mockClear();
});

describe("previewMemberImport", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(previewMemberImport([ROW])).rejects.toThrow(ForbiddenError);
    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
    expect(buildImportPreviewMock).not.toHaveBeenCalled();
  });

  it("passes the validated rows on", async () => {
    const result = await previewMemberImport([ROW]);

    expect(result).toEqual({ success: true, value: { rows: [] } });
    expect(buildImportPreviewMock).toHaveBeenCalledWith([ROW]);
  });

  it("rejects malformed or oversized input without echoing it", async () => {
    const result = await previewMemberImport([
      { ...ROW, memberNumber: "geheim" } as never,
    ]);

    expect(result).toEqual({
      error: "Ungültige Importdaten (höchstens 2000 Zeilen).",
    });
    expect(
      await previewMemberImport(
        Array.from({ length: 2001 }, (_, i) => ({ ...ROW, line: i + 2 })),
      ),
    ).toHaveProperty("error");
    expect(buildImportPreviewMock).not.toHaveBeenCalled();
  });
});

describe("commitMemberImport", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(commitMemberImport([ROW], DECISIONS)).rejects.toThrow(
      ForbiddenError,
    );
    expect(commitMemberImportRecordMock).not.toHaveBeenCalled();
  });

  it("commits with numeric line keys and revalidates the members page", async () => {
    const result = await commitMemberImport([ROW], DECISIONS);

    expect(result).toEqual({ success: true, value: { created: 1 } });
    expect(commitMemberImportRecordMock).toHaveBeenCalledWith([ROW], {
      2: DECISIONS[2],
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/mitglieder");
  });

  it("returns the domain error and does not revalidate", async () => {
    commitMemberImportRecordMock.mockRejectedValue(
      new UserFacingError("Es wurde nichts angelegt."),
    );

    expect(await commitMemberImport([ROW], DECISIONS)).toEqual({
      error: "Es wurde nichts angelegt.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid family references", async () => {
    const result = await commitMemberImport([ROW], {
      2: { ...DECISIONS[2], family: "drop table" },
    });

    expect(result).toEqual({ error: "Ungültige Zuordnungen." });
    expect(commitMemberImportRecordMock).not.toHaveBeenCalled();
  });
});
