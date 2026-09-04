import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const createEventMock = vi.fn();
const updateEventMock = vi.fn();
vi.mock("@/components/feature/admin-events/actions", () => ({
  createEvent: (...args: unknown[]) => createEventMock(...args),
  updateEvent: (...args: unknown[]) => updateEventMock(...args),
}));

// Der eigentliche Kalender-Klick-Flow ist Sache von date-range-picker.test.tsx
// — hier reicht ein simpler Stub, der einen festen Bereich meldet, damit
// dieser Test sich auf EventDialogs eigene Verdrahtung (Weiterleitung nach
// dem Anlegen) konzentrieren kann.
vi.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({
    label,
    value,
    onChange,
  }: {
    id: string;
    label: string;
    value: { start: string; end: string };
    onChange: (value: { start: string; end: string }) => void;
  }) => (
    <div>
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange({ start: "2027-06-01", end: value.end })}
      >
        Zeitraum wählen (Stub)
      </button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventDialog — Datumsbereich statt zwei DatePicker-Instanzen (#458)", () => {
  it("renders one combined 'Beginn – Ende'-trigger, not native date inputs", async () => {
    render(<EventDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Event anlegen" }));
    const dialog = await screen.findByRole("dialog");

    expect(screen.getByText("Beginn – Ende (optional)")).toBeInTheDocument();
    expect(dialog.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });
});

describe("EventDialog — Weiterleitung nach dem Anlegen (#458)", () => {
  async function fillTitleAndStartDate() {
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("Titel"), {
      target: { value: "Neues Event" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Zeitraum wählen (Stub)" }),
    );
    return dialog;
  }

  it("navigates to the new event's detail page on successful creation", async () => {
    createEventMock.mockResolvedValue({
      success: true,
      id: "event-1",
      slug: "neues-event",
    });
    render(<EventDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Event anlegen" }));
    const dialog = await fillTitleAndStartDate();

    fireEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (button) => button.textContent === "Event anlegen",
      )!,
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/admin/events/neues-event");
    });
  });

  it("does not navigate when creation fails", async () => {
    createEventMock.mockResolvedValue({ error: "Ungültige Eingabe." });
    render(<EventDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Event anlegen" }));
    const dialog = await fillTitleAndStartDate();

    fireEvent.click(
      Array.from(dialog.querySelectorAll("button")).find(
        (button) => button.textContent === "Event anlegen",
      )!,
    );

    await waitFor(() => {
      expect(createEventMock).toHaveBeenCalled();
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
