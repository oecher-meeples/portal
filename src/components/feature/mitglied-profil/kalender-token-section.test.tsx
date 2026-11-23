import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KalenderTokenSection } from "./kalender-token-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const generateMock = vi.fn();
const revokeMock = vi.fn();
const sendMailMock = vi.fn();
vi.mock("@/components/feature/mitglied-profil/kalender-token-actions", () => ({
  generateMemberCalendarSubscription: (...args: unknown[]) =>
    generateMock(...args),
  revokeMemberCalendarSubscription: (...args: unknown[]) => revokeMock(...args),
  sendMemberCalendarSubscriptionMail: (...args: unknown[]) =>
    sendMailMock(...args),
}));

afterEach(cleanup);

describe("KalenderTokenSection (#438)", () => {
  it("shows 'noch nicht erzeugt' without a token", () => {
    render(
      <KalenderTokenSection
        memberId="member-1"
        hasToken={false}
        tokenCreatedAt={null}
      />,
    );

    expect(screen.getByText(/noch nicht erzeugt/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Widerrufen/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the creation date and a revoke button once a token exists", () => {
    render(
      <KalenderTokenSection
        memberId="member-1"
        hasToken={true}
        tokenCreatedAt="2026-06-15T10:00:00.000Z"
      />,
    );

    expect(screen.getByText(/erzeugt am/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Widerrufen/ }),
    ).toBeInTheDocument();
  });

  it("shows the fresh subscribe URL after clicking 'Neu erzeugen'", async () => {
    const user = userEvent.setup();
    generateMock.mockResolvedValue({
      success: true,
      subscribeUrl: "https://example.org/api/calendar/internal/abc.ics",
    });
    render(
      <KalenderTokenSection
        memberId="member-1"
        hasToken={false}
        tokenCreatedAt={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Neu erzeugen/ }));

    expect(
      await screen.findByText(
        "https://example.org/api/calendar/internal/abc.ics",
      ),
    ).toBeInTheDocument();
  });
});
