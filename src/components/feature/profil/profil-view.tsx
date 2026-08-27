import type { Meeple, NewsletterCategory } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { maskIban } from "@/lib/utils/crypto";
import { MembershipStatePill } from "@/components/entities/membership-state-pill";
import type { MembershipState } from "@/lib/members/meeples";
import { BankDetailsForm } from "@/components/feature/profil/bank-details-form";
import { ProfileDetailsForm } from "@/components/feature/profil/profile-details-form";
import { ResignMembershipPanel } from "@/components/feature/profil/resign-membership-panel";
import { DataExportPanel } from "@/components/feature/profil/data-export-panel";
import { DeletionRequestPanel } from "@/components/feature/profil/deletion-request-panel";
import { NewsletterPreferencePanel } from "@/components/feature/profil/newsletter-preference-panel";
import type { OpenHoldingsSummary } from "@/lib/members/open-holdings";
import { formatDatePlain } from "@/lib/utils/format";

function initials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function germanDate(value: Date | null) {
  if (!value) return "—";
  return formatDatePlain(value);
}

export function ProfilView({
  meeple,
  membershipState,
  deletionRequestedAt,
  openHoldings,
  newsletterPreference,
}: {
  meeple: Meeple;
  membershipState: MembershipState;
  deletionRequestedAt: Date | null;
  openHoldings: OpenHoldingsSummary;
  newsletterPreference: { enabled: boolean; categories: NewsletterCategory[] };
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Self-Service"
        title="Mein Profil"
        description="Deine Daten, deine Bankverbindung und dein Mitgliedschaftszustand."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
            <div className="flex items-center gap-3">
              <span className="bg-foreground text-background flex size-12 items-center justify-center rounded-full font-serif text-lg font-bold">
                {initials(meeple.displayName)}
              </span>
              <div className="flex flex-col gap-1">
                <p className="font-serif text-lg font-semibold">
                  {meeple.displayName}
                </p>
                <MembershipStatePill state={membershipState} />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Mitgliedsnummer</dt>
                <dd className="font-mono">{meeple.memberNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mitglied seit</dt>
                <dd>{germanDate(meeple.joinedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-Mail</dt>
                <dd className="break-all">{meeple.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kündigung vermerkt</dt>
                <dd>{germanDate(meeple.resignedAt)}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              Mitgliedsnummer, Beitrittsdatum und E-Mail-Adresse werden über das
              Login-Konto und die Mitgliederverwaltung geführt.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h2 className="font-serif text-lg font-bold">Angaben zu mir</h2>
            <div className="mt-4">
              <ProfileDetailsForm
                displayName={meeple.displayName}
                bggUsername={meeple.bggUsername}
                privateCollectionVisible={meeple.privateCollectionVisible}
                bgaUsername={meeple.bgaUsername}
                telegramHandle={meeple.telegramHandle}
                signalHandle={meeple.signalHandle}
                discordHandle={meeple.discordHandle}
                address={meeple.address}
                shareAddress={meeple.shareAddress}
                doorbellNote={meeple.doorbellNote}
              />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h2 className="font-serif text-lg font-bold">Newsletter</h2>
            <div className="mt-4">
              <NewsletterPreferencePanel
                initialEnabled={newsletterPreference.enabled}
                initialCategories={newsletterPreference.categories}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h2 className="font-serif text-lg font-bold">
              Bankverbindung (Beitragseinzug)
            </h2>
            <div className="mt-4">
              <BankDetailsForm
                accountHolder={meeple.accountHolder}
                ibanLast4={meeple.ibanLast4}
                maskedIban={maskIban(meeple.ibanLast4)}
              />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h2 className="font-serif text-lg font-bold">Datenschutz</h2>
            <ul className="text-muted-foreground mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
              <li>
                Deine IBAN wird verschlüsselt gespeichert. Im Klartext sieht sie
                ausschließlich der Kassenwart, und jeder solche Zugriff wird
                protokolliert.
              </li>
              <li>
                Nach einem Austritt werden Konto, Name und Kontaktdaten
                gelöscht, sobald keine Vereinsspiele mehr bei dir liegen.
                Aufenthalte und Gesuche bleiben dann namenlos lesbar.
              </li>
              <li>Zugriffsprotokolle werden 24 Monate aufbewahrt.</li>
            </ul>
            <div className="mt-4 border-t pt-4">
              <DataExportPanel />
            </div>
            <div className="mt-4 border-t pt-4">
              <DeletionRequestPanel
                requestedAt={deletionRequestedAt}
                openHoldings={openHoldings}
              />
            </div>
          </div>

          <div className="border-destructive/30 bg-card rounded-lg border p-6">
            <h2 className="text-destructive font-serif text-lg font-bold">
              Mitgliedschaft beenden
            </h2>
            <div className="mt-3">
              <ResignMembershipPanel
                resignedAt={meeple.resignedAt?.toISOString() ?? null}
                membershipEndsAt={
                  meeple.membershipEndsAt?.toISOString() ?? null
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
