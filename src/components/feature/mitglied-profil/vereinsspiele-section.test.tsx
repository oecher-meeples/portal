import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { VereinsspieleSection } from "@/components/feature/mitglied-profil/vereinsspiele-section";

const acceptReturnDialogMock = vi.fn();
const giveToMeepleDialogMock = vi.fn();

vi.mock("@/components/widgets/game-holding/holding-mini-dialogs", () => ({
  GiveToMeepleDialog: (props: { triggerVariant?: string }) => {
    giveToMeepleDialogMock(props);
    return <button>Weitergeben</button>;
  },
  AcceptReturnDialog: (props: { hideSelfMode?: boolean }) => {
    acceptReturnDialogMock(props);
    return <button>Rückgabe</button>;
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VereinsspieleSection (#383)", () => {
  const HOLDING = {
    gameCopyId: "copy-1",
    boardGameId: "bg-1",
    boardGameTitle: "Ark Nova",
    startedAt: new Date("2026-08-01"),
    locationChain: "",
    condition: null,
    ruleBookLanguages: [],
    inventoryNumber: null,
    isUnconfirmed: false,
  };

  it("renders nothing without active holdings", () => {
    const { container } = render(
      <VereinsspieleSection holdings={[]} viewerIsSubject={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("lists active holdings with quick actions", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(screen.getByText("Ark Nova")).toBeInTheDocument();
    expect(screen.getByText("Weitergeben")).toBeInTheDocument();
    expect(screen.getByText("Rückgabe")).toBeInTheDocument();
  });

  it("keeps the 'An mich'-Tab for a viewer other than the holder (#443)", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(acceptReturnDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ hideSelfMode: false }),
    );
  });

  it("suppresses the 'An mich'-Tab when the viewer is the holder (#443)", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={true} />,
    );

    expect(acceptReturnDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ hideSelfMode: true }),
    );
  });

  // #455: freistehend im Profil braucht der Trigger sichtbare Button-Optik
  // statt des ghost-Defaults, der zum Dropdown-Menü-Kontext gehört.
  it("gives both trigger buttons a visible button style", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(acceptReturnDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ triggerVariant: "outline" }),
    );
    expect(giveToMeepleDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ triggerVariant: "outline" }),
    );
  });
});
