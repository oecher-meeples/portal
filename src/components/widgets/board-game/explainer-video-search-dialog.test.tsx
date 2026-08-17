import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplainerVideoSearchDialog } from "@/components/widgets/board-game/explainer-video-search-dialog";

const fetchExplainerVideoOptionsMock = vi.fn();
vi.mock("@/lib/ludothek/board-games-bgg-import", () => ({
  fetchExplainerVideoOptions: (...args: unknown[]) =>
    fetchExplainerVideoOptionsMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ExplainerVideoSearchDialog", () => {
  it("disables the trigger when no bggId is set", () => {
    render(<ExplainerVideoSearchDialog bggId={null} onSelect={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    ).toBeDisabled();
  });

  it("shows title, channel, subscribers and an external link per video", async () => {
    const user = userEvent.setup();
    fetchExplainerVideoOptionsMock.mockResolvedValue({
      success: true,
      source: "bgg-german",
      videos: [
        {
          title: "Regeln auf Deutsch",
          url: "https://www.youtube.com/watch?v=german1",
          channel: "ChannelA",
          subscriberCount: 45000,
        },
        {
          title: "Ausführliche Regelerklärung",
          url: "https://www.youtube.com/watch?v=german2",
          channel: "ChannelB",
        },
      ],
    });

    render(<ExplainerVideoSearchDialog bggId={342942} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    );

    await screen.findByText("Regeln auf Deutsch");
    expect(screen.getByText("ChannelA")).toBeInTheDocument();
    expect(screen.getByText("45.000")).toBeInTheDocument();
    expect(screen.getByText("Ausführliche Regelerklärung")).toBeInTheDocument();
    expect(screen.getByText("ChannelB")).toBeInTheDocument();
    // No subscriberCount for the second video — shown as a dash, not "0".
    expect(screen.getByText("–")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: "Ansehen" });
    expect(links[0]).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=german1",
    );
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("selects a video via double-click and confirms immediately", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    fetchExplainerVideoOptionsMock.mockResolvedValue({
      success: true,
      source: "bgg-german",
      videos: [
        {
          title: "Regeln auf Deutsch",
          url: "https://www.youtube.com/watch?v=german1",
          channel: "ChannelA",
        },
      ],
    });

    render(<ExplainerVideoSearchDialog bggId={342942} onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    );

    const row = await screen.findByText("Regeln auf Deutsch");
    await user.dblClick(row);

    expect(onSelect).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=german1",
    );
  });

  it("selects a video via click and confirms via the Übernehmen button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    fetchExplainerVideoOptionsMock.mockResolvedValue({
      success: true,
      source: "bgg-fallback",
      videos: [
        {
          title: "Ark Nova Tutorial",
          url: "https://www.youtube.com/watch?v=fallback",
          channel: "tutorialmaker",
        },
      ],
    });

    render(<ExplainerVideoSearchDialog bggId={342942} onSelect={onSelect} />);

    await user.click(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    );

    const confirmButton = screen.getByRole("button", { name: "Übernehmen" });
    expect(confirmButton).toBeDisabled();
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(await screen.findByText("Ark Nova Tutorial"));
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(onSelect).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=fallback",
    );
  });

  it("shows an error when nothing is found anywhere", async () => {
    const user = userEvent.setup();
    fetchExplainerVideoOptionsMock.mockResolvedValue({
      success: true,
      source: "bgg-fallback",
      videos: [],
    });

    render(<ExplainerVideoSearchDialog bggId={342942} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    );

    expect(
      await screen.findByText(
        "Kein Video in den 15 aktuellsten BGG-Videos gefunden.",
        { exact: false },
      ),
    ).toBeInTheDocument();
  });

  it("shows a speaking error instead of the video list when it fails", async () => {
    const user = userEvent.setup();
    fetchExplainerVideoOptionsMock.mockResolvedValue({
      success: false,
      error:
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });

    render(<ExplainerVideoSearchDialog bggId={342942} onSelect={vi.fn()} />);

    await user.click(
      screen.getByRole("button", { name: "Erklärvideo suchen" }),
    );

    expect(
      await screen.findByText(
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
      ),
    ).toBeInTheDocument();
  });
});
