"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import { CodeScanner } from "@/components/ui/code-scanner";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { ContactDialog } from "@/components/entities/contact-dialog";
import {
  getGuestGameDetail,
  lookupGuestGame,
  type GuestGameDetail,
  type GuestGameMatch,
} from "@/components/feature/guest-area/actions";
import {
  FreeGamesList,
  type FreeGameEntry,
} from "@/components/feature/guest-area/free-games-list";
import type { GuestFleaMarketItem } from "@/lib/events/guest-area";
import { FLEA_MARKET_ITEM_STATUS_LABELS } from "@/lib/utils/format";
import { RegisterExternalSellerDialog } from "@/components/widgets/bringbuy/register-external-seller-dialog";
import { PageContainer } from "@/components/ui/page-container";

export type SellerAccess =
  { kind: "meeple"; href: string } | { kind: "guest"; eventId: string };

const EXPLAINER_LEVEL_LABELS: Record<string, string> = {
  WITH_MANUAL: "Mit Anleitung",
  WITHOUT_MANUAL: "Ohne Anleitung",
  BY_HEART: "Im Schlaf",
};

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown" }
  | { kind: "select"; games: GuestGameMatch[] }
  | { kind: "detail"; detail: GuestGameDetail };

export function GuestAreaView({
  eventId,
  eventTitle,
  freeGames,
  fleaMarketItems,
  sellerAccess,
}: {
  eventId: string;
  eventTitle: string;
  freeGames: FreeGameEntry[];
  fleaMarketItems: GuestFleaMarketItem[];
  sellerAccess: SellerAccess | null;
}) {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [manualInput, setManualInput] = useState("");

  async function handleCode(raw: string) {
    const result = await lookupGuestGame(raw);
    if (result.kind === "unknown") {
      setState({ kind: "unknown" });
      return;
    }
    if (result.games.length === 1) {
      await selectGame(result.games[0].id);
      return;
    }
    setState({ kind: "select", games: result.games });
  }

  async function selectGame(boardGameId: string) {
    const detail = await getGuestGameDetail(eventId, boardGameId);
    if (!detail) {
      setState({ kind: "unknown" });
      return;
    }
    setState({ kind: "detail", detail });
  }

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Gäste-Bereich"
        title={eventTitle}
        description="Scanne den Barcode einer Spielebox oder gib ihn manuell ein."
      />

      <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
        <CodeScanner onDetected={handleCode} frame={false} stopOnDetect />
        <div className="flex gap-2">
          <Input
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="EAN manuell eingeben"
          />
          <Button
            type="button"
            onClick={() => manualInput.trim() && handleCode(manualInput.trim())}
          >
            Suchen
          </Button>
        </div>
      </div>

      {state.kind === "unknown" && (
        <p className="text-destructive text-sm">
          Kein Spiel mit diesem Code gefunden.
        </p>
      )}

      {state.kind === "select" && (
        <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Mehrere Treffer — bitte auswählen:
          </p>
          {state.games.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              className="justify-start"
              onClick={() => selectGame(game.id)}
            >
              {game.title}
            </Button>
          ))}
        </div>
      )}

      {state.kind === "detail" && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 className="font-serif text-xl font-bold">{state.detail.title}</h2>
          {state.detail.description && (
            <p className="text-muted-foreground text-sm">
              {state.detail.description}
            </p>
          )}
          <p className="text-sm">
            {state.detail.isInRoom ? "Aktuell im Raum" : "Nicht im Raum"}
          </p>
          {state.detail.explainerVideoUrl && (
            <a
              href={state.detail.explainerVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-sm hover:underline"
            >
              Erklärvideo ansehen →
            </a>
          )}
          {state.detail.attendingExplainers.length > 0 && (
            <div>
              <p className="text-sm font-medium">Anwesende Erklärbären</p>
              <ul className="text-muted-foreground text-sm">
                {state.detail.attendingExplainers.map((explainer) => (
                  <li
                    key={explainer.meepleId}
                    className="flex items-center gap-2 py-0.5"
                  >
                    {/* #412: profilePictureUrl/contact/profileHref kommen
                     * bereits serverseitig geprüft an (getAttendingExplainers()
                     * löst die meepleDatenVisibility-/Freigabe-Prüfung aus
                     * #389 auf) — MeepleAvatar ohne viewer/
                     * profilePictureVisibility übernimmt sie unverändert. */}
                    <MeepleAvatar
                      name={explainer.displayName}
                      profilePictureUrl={explainer.profilePictureUrl}
                      size="md"
                    />
                    <span>
                      <ContactDialog
                        name={explainer.displayName}
                        meeple={{
                          profilePictureUrl: explainer.profilePictureUrl,
                          contact: explainer.contact,
                          profileHref: explainer.profileHref,
                        }}
                      />{" "}
                      ·{" "}
                      {EXPLAINER_LEVEL_LABELS[explainer.level] ??
                        explainer.level}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <FreeGamesList games={freeGames} />

      {fleaMarketItems.length > 0 && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-lg font-bold">
              Bring &amp; Buy Flohmarkt
            </h2>
            {sellerAccess?.kind === "meeple" && (
              <Button
                size="sm"
                render={
                  <Link href={sellerAccess.href}>Spieleverkauf anmelden</Link>
                }
              />
            )}
            {sellerAccess?.kind === "guest" && (
              <RegisterExternalSellerDialog eventId={sellerAccess.eventId} />
            )}
          </div>
          <ul className="flex flex-col divide-y text-sm">
            {fleaMarketItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>{item.priceEuros} €</span>
                  <span className="text-muted-foreground text-xs">
                    {FLEA_MARKET_ITEM_STATUS_LABELS[item.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageContainer>
  );
}
