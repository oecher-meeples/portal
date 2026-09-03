import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/feature/admin-events/actions", () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

afterEach(cleanup);

// #434: Beginn/Ende nutzen den DatePicker-Baustein statt eines nativen
// <input type="date">.
describe("EventDialog — DatePicker statt nativem Browser-Kalender (#434)", () => {
  it("renders 'Beginn' and 'Ende' as DatePicker triggers, not native date inputs", async () => {
    render(<EventDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Event anlegen" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText("Beginn")).toHaveTextContent(
      "Datum wählen",
    );
    expect(within(dialog).getByLabelText("Ende (optional)")).toHaveTextContent(
      "Datum wählen",
    );
    expect(dialog.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });
});
