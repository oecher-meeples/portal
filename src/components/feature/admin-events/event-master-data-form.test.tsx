import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EventMasterDataForm } from "./event-master-data-form";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const updateEventMock = vi.fn();
const setHelperPhaseMock = vi.fn();
vi.mock("@/components/feature/admin-events/actions", () => ({
  updateEvent: (...args: unknown[]) => updateEventMock(...args),
  setEventHelperPhase: (...args: unknown[]) => setHelperPhaseMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const EVENT = {
  id: "event-1",
  title: "Spieletag",
  startsAt: "2026-10-10T00:00:00.000Z",
  endsAt: null,
  location: "Vereinsheim",
  helperPhase: "PLANNING" as const,
  visibility: "DRAFT" as const,
};

describe("EventMasterDataForm (#680)", () => {
  it("is readonly until Bearbeiten is clicked", () => {
    render(<EventMasterDataForm event={EVENT} />);

    expect(screen.getByLabelText("Titel")).toBeDisabled();
    expect(screen.getByLabelText("Eventsichtbarkeit")).toBeDisabled();
    expect(screen.getByLabelText("Helfersichtbarkeit")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Speichern" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(screen.getByLabelText("Titel")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Speichern" })).toBeEnabled();
  });

  it("saves via updateEvent and the shared helper-phase action, then refreshes", async () => {
    updateEventMock.mockResolvedValue({ success: true });
    setHelperPhaseMock.mockResolvedValue({ success: true });
    render(<EventMasterDataForm event={EVENT} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.change(screen.getByLabelText("Helfersichtbarkeit"), {
      target: { value: "SEEKING" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => {
      expect(setHelperPhaseMock).toHaveBeenCalledWith("event-1", "SEEKING");
    });
    expect(updateEventMock).toHaveBeenCalledWith(
      "event-1",
      expect.objectContaining({ title: "Spieletag", visibility: "DRAFT" }),
    );
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("does not call the helper-phase action when the phase is unchanged", async () => {
    updateEventMock.mockResolvedValue({ success: true });
    render(<EventMasterDataForm event={EVENT} />);

    fireEvent.click(screen.getByRole("button", { name: "Bearbeiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await waitFor(() => expect(updateEventMock).toHaveBeenCalled());
    expect(setHelperPhaseMock).not.toHaveBeenCalled();
  });
});
