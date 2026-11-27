import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ShiftTableEditor } from "./shift-table-editor";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/feature/admin-events/shift-actions", () => ({
  createShift: vi.fn(),
  updateShift: vi.fn(),
  deleteShift: vi.fn(),
}));

afterEach(cleanup);

const days = [
  { id: "d1", date: "2026-10-10T00:00:00.000Z" },
  { id: "d2", date: "2026-10-11T00:00:00.000Z" },
  { id: "d3", date: "2026-10-12T00:00:00.000Z" },
];
const shifts = [
  {
    id: "s1",
    dayId: "d2",
    dayDate: days[1].date,
    roleId: "r1",
    roleName: "Theke",
    targetStartsAt: new Date(2026, 9, 11, 10, 0).toISOString(),
    targetEndsAt: new Date(2026, 9, 11, 14, 0).toISOString(),
    capacity: 1,
    bookings: [],
  },
];

function renderEditor() {
  render(
    <ShiftTableEditor
      eventId="e1"
      days={days}
      shifts={shifts}
      helperRoles={[{ id: "r1", name: "Theke" }]}
      onCancel={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
}

describe("ShiftTableEditor", () => {
  it("shows every day as a group, empty ones with a placeholder", () => {
    renderEditor();

    expect(screen.getAllByRole("region")).toHaveLength(3);
    expect(screen.getAllByText("Noch keine Schicht angelegt.")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Schicht" })).toHaveLength(3);
    expect(screen.queryByLabelText("Tag")).toBeNull();
  });

  it("adds a row inside the clicked day's group", () => {
    renderEditor();
    const group = screen.getAllByRole("region")[2];

    fireEvent.click(within(group).getByRole("button", { name: "Schicht" }));

    expect(within(group).getAllByLabelText("Stellenzahl")).toHaveLength(1);
    expect(
      within(screen.getAllByRole("region")[1]).getAllByLabelText("Stellenzahl"),
    ).toHaveLength(1);
  });
});
