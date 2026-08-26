import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EanField } from "@/components/widgets/board-game/ean-field";

const searchEanForBoardGameMock = vi.fn();
vi.mock("@/lib/ludothek/ean-search", () => ({
  searchEanForBoardGame: (...args: unknown[]) =>
    searchEanForBoardGameMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EanField", () => {
  it("disables the search button without a title", () => {
    render(<EanField idPrefix="test" value="" onChange={vi.fn()} title="" />);

    expect(
      screen.getByRole("button", { name: "EAN zum Titel suchen" }),
    ).toBeDisabled();
  });

  it("applies the ean directly for exactly one hit (#197)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    searchEanForBoardGameMock.mockResolvedValue({
      success: true,
      results: [{ ean: "0850000576407", title: "Ark Nova" }],
    });

    render(
      <EanField
        idPrefix="test"
        value=""
        onChange={onChange}
        title="Ark Nova"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "EAN zum Titel suchen" }),
    );

    await waitFor(() =>
      expect(searchEanForBoardGameMock).toHaveBeenCalledWith("Ark Nova", {
        bggProductCode: undefined,
        publisher: undefined,
      }),
    );
    expect(onChange).toHaveBeenCalledWith("0850000576407");
  });

  it("shows a selection list for more than one hit instead of auto-filling", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    searchEanForBoardGameMock.mockResolvedValue({
      success: true,
      results: [
        { ean: "0850000576407", title: "Ark Nova (US)", brand: "Capstone" },
        { ean: "4056282500000", title: "Ark Nova (DE)", brand: "Feuerland" },
      ],
    });

    render(
      <EanField
        idPrefix="test"
        value=""
        onChange={onChange}
        title="Ark Nova"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "EAN zum Titel suchen" }),
    );

    expect(await screen.findByText(/Ark Nova \(US\)/)).toBeInTheDocument();
    expect(screen.getByText(/Ark Nova \(DE\)/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByText(/Ark Nova \(DE\)/));

    expect(onChange).toHaveBeenCalledWith("4056282500000");
  });

  it("shows a message without an error for zero hits", async () => {
    const user = userEvent.setup();
    searchEanForBoardGameMock.mockResolvedValue({
      success: true,
      results: [],
    });

    render(
      <EanField
        idPrefix="test"
        value=""
        onChange={vi.fn()}
        title="Ein Titel ohne Treffer"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "EAN zum Titel suchen" }),
    );

    expect(await screen.findByText("Keine EAN gefunden.")).toBeInTheDocument();
  });

  it("shows a speaking error when the search fails", async () => {
    const user = userEvent.setup();
    searchEanForBoardGameMock.mockResolvedValue({
      success: false,
      error: "Die EAN-Suche ist aktuell nicht erreichbar.",
    });

    render(
      <EanField idPrefix="test" value="" onChange={vi.fn()} title="Ark Nova" />,
    );

    await user.click(
      screen.getByRole("button", { name: "EAN zum Titel suchen" }),
    );

    expect(
      await screen.findByText("Die EAN-Suche ist aktuell nicht erreichbar."),
    ).toBeInTheDocument();
  });

  it("auto-searches on mount when autoSearchOnMount is set and the field is empty (#197)", async () => {
    const onChange = vi.fn();
    searchEanForBoardGameMock.mockResolvedValue({
      success: true,
      results: [{ ean: "0850000576407", title: "Ark Nova" }],
    });

    render(
      <EanField
        idPrefix="test"
        value=""
        onChange={onChange}
        title="Ark Nova"
        autoSearchOnMount
      />,
    );

    await waitFor(() =>
      expect(searchEanForBoardGameMock).toHaveBeenCalledWith("Ark Nova", {
        bggProductCode: undefined,
        publisher: undefined,
      }),
    );
    expect(onChange).toHaveBeenCalledWith("0850000576407");
  });

  it("does not auto-search when the field already has a value", () => {
    render(
      <EanField
        idPrefix="test"
        value="4001504311892"
        onChange={vi.fn()}
        title="Catan"
        autoSearchOnMount
      />,
    );

    expect(searchEanForBoardGameMock).not.toHaveBeenCalled();
  });

  it("does not auto-search when autoSearchOnMount is not set", () => {
    render(
      <EanField idPrefix="test" value="" onChange={vi.fn()} title="Ark Nova" />,
    );

    expect(searchEanForBoardGameMock).not.toHaveBeenCalled();
  });

  describe("BGG-Product-Code und Verlags-Sortierung (#205)", () => {
    it("forwards the resolved BGG product code and publisher to the search", async () => {
      const user = userEvent.setup();
      searchEanForBoardGameMock.mockResolvedValue({
        success: true,
        results: [{ ean: "FEU001", title: "Ark Nova", brand: "Feuerland" }],
      });

      render(
        <EanField
          idPrefix="test"
          value=""
          onChange={vi.fn()}
          title="Ark Nova"
          bggProductCode="FEU001"
          publisherForSorting={["Feuerland Spiele"]}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "EAN zum Titel suchen" }),
      );

      await waitFor(() =>
        expect(searchEanForBoardGameMock).toHaveBeenCalledWith("Ark Nova", {
          bggProductCode: "FEU001",
          publisher: ["Feuerland Spiele"],
        }),
      );
    });
  });

  describe("Fallback auf Alternativnamen (#197-Folgeanfrage)", () => {
    it("retries with an alternate title when the main title has no hits", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      searchEanForBoardGameMock
        .mockResolvedValueOnce({ success: true, results: [] })
        .mockResolvedValueOnce({
          success: true,
          results: [{ ean: "4056282500000", title: "Ark Nova (DE)" }],
        });

      render(
        <EanField
          idPrefix="test"
          value=""
          onChange={onChange}
          title="Ark Nova"
          alternateTitles={["Ark Nova (Deutsch)"]}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "EAN zum Titel suchen" }),
      );

      await waitFor(() =>
        expect(searchEanForBoardGameMock).toHaveBeenNthCalledWith(
          1,
          "Ark Nova",
          { bggProductCode: undefined, publisher: undefined },
        ),
      );
      await waitFor(() =>
        expect(searchEanForBoardGameMock).toHaveBeenNthCalledWith(
          2,
          "Ark Nova (Deutsch)",
          { bggProductCode: undefined, publisher: undefined },
        ),
      );
      expect(onChange).toHaveBeenCalledWith("4056282500000");
    });

    it("stops trying further alternates once one yields a hit", async () => {
      const user = userEvent.setup();
      searchEanForBoardGameMock
        .mockResolvedValueOnce({ success: true, results: [] })
        .mockResolvedValueOnce({
          success: true,
          results: [{ ean: "4056282500000", title: "Ark Nova (DE)" }],
        });

      render(
        <EanField
          idPrefix="test"
          value=""
          onChange={vi.fn()}
          title="Ark Nova"
          alternateTitles={["Ark Nova (Deutsch)", "Ark Nova Zoo Edition"]}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "EAN zum Titel suchen" }),
      );

      await waitFor(() =>
        expect(searchEanForBoardGameMock).toHaveBeenCalledTimes(2),
      );
    });

    it("shows 'Keine EAN gefunden' only after every title (main + alternates) missed", async () => {
      const user = userEvent.setup();
      searchEanForBoardGameMock.mockResolvedValue({
        success: true,
        results: [],
      });

      render(
        <EanField
          idPrefix="test"
          value=""
          onChange={vi.fn()}
          title="Ark Nova"
          alternateTitles={["Ark Nova (Deutsch)"]}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "EAN zum Titel suchen" }),
      );

      expect(
        await screen.findByText("Keine EAN gefunden."),
      ).toBeInTheDocument();
      expect(searchEanForBoardGameMock).toHaveBeenCalledTimes(2);
    });

    it("stops immediately on an API error instead of trying alternates", async () => {
      const user = userEvent.setup();
      searchEanForBoardGameMock.mockResolvedValue({
        success: false,
        error: "Die EAN-Suche ist aktuell nicht erreichbar.",
      });

      render(
        <EanField
          idPrefix="test"
          value=""
          onChange={vi.fn()}
          title="Ark Nova"
          alternateTitles={["Ark Nova (Deutsch)"]}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "EAN zum Titel suchen" }),
      );

      expect(
        await screen.findByText("Die EAN-Suche ist aktuell nicht erreichbar."),
      ).toBeInTheDocument();
      expect(searchEanForBoardGameMock).toHaveBeenCalledTimes(1);
    });
  });
});
