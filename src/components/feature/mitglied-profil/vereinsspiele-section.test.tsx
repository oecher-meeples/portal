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
    boardGameSlug: "ark-nova",
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

  // #456: unbestätigte Weitergabe war im Profil bislang nicht sichtbar.
  it("shows '(Unbestätigt)' behind the title for an unconfirmed holding", () => {
    render(
      <VereinsspieleSection
        holdings={[{ ...HOLDING, isUnconfirmed: true }]}
        viewerIsSubject={false}
      />,
    );

    expect(screen.getByText("(Unbestätigt)")).toBeInTheDocument();
  });

  it("does not show '(Unbestätigt)' for a confirmed holding", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(screen.queryByText("(Unbestätigt)")).not.toBeInTheDocument();
  });

  // #457: Titel war reiner Text, Inv.-Nr. fehlte kommentarlos ganz.
  it("links the title to the game's detail page", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(screen.getByRole("link", { name: "Ark Nova" })).toHaveAttribute(
      "href",
      "/ludothek/ark-nova",
    );
  });

  it("shows a labelled inventory number when present", () => {
    render(
      <VereinsspieleSection
        holdings={[{ ...HOLDING, inventoryNumber: "OM-042" }]}
        viewerIsSubject={false}
      />,
    );

    expect(screen.getByText(/Inv\.-Nr\.: OM-042/)).toBeInTheDocument();
  });

  it("shows a placeholder instead of omitting the inventory number", () => {
    render(
      <VereinsspieleSection holdings={[HOLDING]} viewerIsSubject={false} />,
    );

    expect(screen.getByText(/Inv\.-Nr\.: —/)).toBeInTheDocument();
  });
});
