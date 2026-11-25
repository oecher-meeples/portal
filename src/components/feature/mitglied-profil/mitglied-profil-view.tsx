import { PendingChangeKind, type Member } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { Card, CardTitle } from "@/components/ui/card";
import { memberDisplayName } from "@/lib/members/member-display-name";
import {
  canViewBankSection,
  type ProfileViewerContext,
} from "@/lib/members/profile-access";
import { isMiniMeeple } from "@/lib/members/contribution";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { listOpenPendingChangesForMember } from "@/lib/members/pending-changes";
import { getActiveHoldingsForMember } from "@/lib/ludothek/holdings-by-meeple";
import {
  canForceImport,
  countPrivateCollectionEntries,
  getImportCooldownEndsAt,
  getOwnPrivateCollection,
} from "@/lib/ludothek/private-collection";
import { getLatestPrivateCollectionImportJob } from "@/lib/ludothek/private-collection-import-queue";
import { listOwnPrivateLoanOffers } from "@/lib/ludothek/private-event-loans";
import { findUpcomingEventsVisibleToMembers } from "@/lib/events/upcoming";
import { PrivateCollectionCard } from "@/components/widgets/private-collection/private-collection-card";
import { PrivateSpieleSection } from "@/components/feature/mitglied-profil/private-spiele-section";
import { WantToPlaySection } from "@/components/feature/mitglied-profil/want-to-play-section";
import { AdminBggImportCard } from "@/components/feature/mitglied-profil/admin-bgg-import-card";
import { findMeepleNewsletterPreference } from "@/lib/newsletter/subscribers";
import { countOpenHoldings } from "@/lib/members/open-holdings";
import { findOpenDeletionRequest } from "@/lib/members/deletion-requests";
import { NewsletterPreferencePanel } from "@/components/widgets/profil-panels/newsletter-preference-panel";
import { DataExportPanel } from "@/components/widgets/profil-panels/data-export-panel";
import { DeletionRequestPanel } from "@/components/widgets/profil-panels/deletion-request-panel";
import { ResignMembershipPanel } from "@/components/widgets/profil-panels/resign-membership-panel";
import { listTshirtSizes } from "@/lib/members/tshirt-sizes";
import { listChildrenOf, listGuardiansOf } from "@/lib/members/guardians";
import { MeineKinderSection } from "@/components/feature/mitglied-profil/meine-kinder-section";
import { ErziehungsberechtigteSection } from "@/components/feature/mitglied-profil/erziehungsberechtigte-section";
import {
  formatStammdatenDiffSummary,
  listOpenStammdatenChanges,
} from "@/lib/members/stammdaten";
import {
  decryptSecret,
  ibanFirst2,
  ibanLast4,
  maskIban,
} from "@/lib/utils/crypto";
import { StammdatenSection } from "@/components/feature/mitglied-profil/stammdaten-section";
import { BankverbindungSection } from "@/components/feature/mitglied-profil/bankverbindung-section";
import { EmailAddressSection } from "@/components/feature/mitglied-profil/email-address-section";
import { PasswordChangeSection } from "@/components/feature/mitglied-profil/password-change-section";
import { KalenderTokenSection } from "@/components/feature/mitglied-profil/kalender-token-section";
import { VereinsspieleSection } from "@/components/feature/mitglied-profil/vereinsspiele-section";
import {
  MeepleDatenSection,
  type MeepleDatenMeeple,
} from "@/components/feature/mitglied-profil/meeple-daten-section";
import { PageContainer } from "@/components/ui/page-container";

/** Route-Einstieg für `/profil` (eigenes Profil) und `/profil/[slug]`
 * (fremdes Profil) (#379 ff.) — setzt die einzelnen
 * Bereiche der Epic (#380–#385, #388, #389, #376) zusammen. Zugriffsschutz
 * läuft bereits vollständig in `page.tsx`/`profile-access.ts`. */
export async function MitgliedProfilView({
  member,
  viewer,
}: {
  member: Member & {
    meeple:
      | (MeepleDatenMeeple & {
          displayName: string;
          neonAuthUserId: string | null;
          privateCollectionVisible: boolean;
          importWantToPlay: boolean;
          shareForTrade: boolean;
          privateCollectionSyncedAt: Date | null;
        })
      | null;
  };
  viewer: ProfileViewerContext;
}) {
  const isSelf = member.meepleId === viewer.currentMeepleId;
  const canRequestChange = isSelf || viewer.isGuardianOfTarget;

  // Für `isAdmin` zur Freigabe, für `canRequestChange` als eigener
  // "wartet auf Freigabe"-Hinweis (#380) — dieselbe Liste bedient beides.
  const openStammdatenChanges =
    viewer.isAdmin || canRequestChange
      ? await listOpenStammdatenChanges(member.id)
      : [];
  const ownStammdatenChange = canRequestChange
    ? (openStammdatenChanges[0] ?? null)
    : null;
  const tshirtSizes = await listTshirtSizes();
  const tshirtSizeLabelById = Object.fromEntries(
    tshirtSizes.map((size) => [size.id, size.label]),
  );

  const bankSectionVisible =
    canViewBankSection(member, viewer) && !isMiniMeeple(member);
  // Analog zu `openStammdatenChanges`: Kassenwart zur Freigabe, Antragsteller
  // selbst nur für den eigenen "wartet auf Freigabe"-Hinweis (#381).
  const openIbanChanges =
    bankSectionVisible && (viewer.canReadBank || canRequestChange)
      ? await listOpenPendingChangesForMember(member.id, PendingChangeKind.IBAN)
      : [];
  const ownIbanChange = canRequestChange ? (openIbanChanges[0] ?? null) : null;

  const canViewVereinsspiele =
    viewer.canManageGames || isSelf || viewer.isGuardianOfTarget;
  const holdings = canViewVereinsspiele
    ? await getActiveHoldingsForMember(member.id)
    : [];

  // (#122) Nächstes kommendes Event als einziger Freigabe-Kontext — bewusst
  // kein Mehrfach-Event-Picker, das Feature deckt den Regelfall "das nächste
  // Spieletreffen" ab.
  const upcomingEvents = isSelf
    ? await findUpcomingEventsVisibleToMembers({ id: true, title: true })
    : [];
  const nextEvent = upcomingEvents[0] ?? null;

  const ownPrivateCollection =
    isSelf && member.meeple
      ? {
          entries: await getOwnPrivateCollection(member.meeple.id),
          cooldownEndsAt: await getImportCooldownEndsAt(member.meeple),
          canForceImport: await canForceImport(member.meeple.neonAuthUserId),
          nextEvent,
          ownOffers: nextEvent
            ? await listOwnPrivateLoanOffers(member.meeple.id, nextEvent.id)
            : [],
        }
      : null;

  // #632: fremde Profile zeigen die „Private Spiele"-Karte nur mit Einträgen;
  // Admins sehen die Zahl zusätzlich an der Import-Karte.
  const otherPrivateCount =
    !isSelf && member.meeple
      ? await countPrivateCollectionEntries(member.meeple.id)
      : 0;

  // #632: Zustand des Queue-Imports — für die eigene Karte und die Admin-Karte.
  const latestImportJob =
    member.meeple && (isSelf || viewer.canManageMembers)
      ? await getLatestPrivateCollectionImportJob(member.meeple.id)
      : null;

  // #376: strikt auf das eigene Profil begrenzt — niemals auf einer fremden
  // Profilseite geladen, auch nicht für admin:access/members:manage.
  const myChildren = isSelf ? await listChildrenOf(member.id) : [];

  // #385: umgekehrte Richtung — Erziehungsberechtigte eines Kindes, sichtbar
  // für Vorstand und die verknüpften Erziehungsberechtigten selbst, nie für
  // das MiniMeeple/JungMeeple auf dem eigenen Profil (kein `isSelf`-Fall).
  const guardiansOfMember =
    !isSelf &&
    (viewer.isAdmin || viewer.canManageMembers || viewer.isGuardianOfTarget)
      ? await listGuardiansOf(member.id)
      : [];

  const selfServiceData =
    isSelf && member.meeple
      ? {
          newsletterPreference: await findMeepleNewsletterPreference(
            member.meeple.id,
          ),
          openHoldings: await countOpenHoldings(member.meeple.id),
          // #614: eigener, noch offener E-Mail-Änderungsantrag.
          openEmailChange:
            (
              await listOpenPendingChangesForMember(
                member.id,
                PendingChangeKind.MEMBER_EMAIL,
              )
            )[0] ?? null,
          deletionRequestedAt:
            (await findOpenDeletionRequest(member.meeple.id))?.requestedAt ??
            null,
        }
      : null;

  return (
    <PageContainer className="max-w-6xl gap-6 px-4 py-8">
      <PageHeading
        eyebrow={`Mitglied Nr. ${member.memberNumber}`}
        title={memberDisplayName(member)}
        media={
          member.meeple && (
            // Jede:r Betrachter:in dieser Seite ist ein eingeloggtes Meeple
            // (Route ist auth-gated) — `isProfilePictureVisible()` zeigt
            // "INTERN" damit ohnehin immer, EVENTS/IMMER sowieso; kein
            // Gast-Fall hier möglich.
            <MeepleAvatar
              name={memberDisplayName(member)}
              profilePictureUrl={member.meeple.profilePictureUrl}
              profilePictureVisibility={member.meeple.profilePictureVisibility}
              viewer={{ kind: "meeple" }}
              size="xxxl"
              hideWithoutPicture
            />
          )
        }
        description={
          isSelf
            ? "Dein Mitgliedsprofil."
            : viewer.isGuardianOfTarget
              ? "Profil deines Kindes."
              : undefined
        }
      />

      {/* Jede Card bekommt ihre Spaltenbreite einzeln (`col-span-*`) statt
       * pauschal 1/2 — kleine Bereiche (Bankverbindung, Newsletter, …)
       * bleiben schmal, inhaltsreiche (Stammdaten, Meeple-Daten, Listen)
       * nutzen die volle Breite. `lg:grid-cols-3` (Live-Review F10) gegen zu
       * viel Leerraum auf großen Displays — die bestehenden `md:col-span-2`
       * (2 von 3 Spalten bei `lg`) und Karten ohne Angabe (1 von 3) brauchen
       * dafür keine eigene `lg:col-span-*`: Tailwinds Breakpoints kaskadieren
       * nach oben, `md:col-span-2` gilt unverändert auch ab `lg` weiter.
       * `items-start` statt des Grid-Defaults `stretch`, sonst zieht sich
       * eine kurze Karte (z. B. Newsletter) auf die Höhe der langen
       * Zeilennachbarin (z. B. Datenschutz) — sichtbar leerer Innenraum.
       * `grid-flow-dense` füllt Lücken, die eine `col-span-2`-Karte
       * hinterlässt, mit späteren kleineren Karten auf — nötig, weil nicht
       * jede:r Betrachter:in dieselben Karten sieht (Bankdaten nur
       * Meeple/Kassenwart, Vereinsspiele nur mit Berechtigung, …) und sich
       * die Kartenkombination damit pro Rolle unterscheidet; von Hand
       * ausbalancierte `col-span`-Werte könnten das nicht abdecken. */}
      <div className="grid grid-cols-1 gap-6 md:grid-flow-dense md:grid-cols-2 md:items-start lg:grid-cols-3">
        <div className="md:col-span-2">
          <StammdatenSection
            // Nur die Felder der Client-Komponente — das volle `Member`
            // trägt das verschachtelte Prisma-Meeple (Proxy der
            // Result-Extension, #112) und ein `Decimal`, beides kann React
            // nicht an Client-Komponenten serialisieren.
            member={{
              id: member.id,
              firstName: member.firstName,
              lastName: member.lastName,
              birthDate: member.birthDate,
              birthPlace: member.birthPlace,
              street: member.street,
              postalCode: member.postalCode,
              city: member.city,
              phone: member.phone,
              tshirtSizeId: member.tshirtSizeId,
              joinedAt: member.joinedAt,
            }}
            canManage={viewer.canManageMembers}
            canRequestChange={canRequestChange}
            isAdmin={viewer.isAdmin}
            tshirtSizeOptions={tshirtSizes}
            ownPendingChange={
              ownStammdatenChange
                ? {
                    requestedAt: ownStammdatenChange.requestedAt.toISOString(),
                  }
                : null
            }
            openChanges={openStammdatenChanges.map((change) => ({
              id: change.id,
              memberDisplayName: memberDisplayName(member),
              memberNumber: member.memberNumber,
              memberSlug: member.slug,
              displayValue: formatStammdatenDiffSummary(
                change.fieldsJson,
                tshirtSizeLabelById,
              ),
              requestedAt: change.requestedAt.toISOString(),
              confirmed: true,
            }))}
          />
        </div>

        {bankSectionVisible && (
          <BankverbindungSection
            memberId={member.id}
            meepleId={member.meepleId}
            accountHolder={member.accountHolder}
            maskedIban={maskIban(member.ibanFirst2, member.ibanLast4)}
            hasIban={member.ibanEncrypted !== null}
            canEdit={viewer.canReadBank}
            canRequestChange={canRequestChange}
            ownPendingChange={
              ownIbanChange
                ? { requestedAt: ownIbanChange.requestedAt.toISOString() }
                : null
            }
            openChanges={openIbanChanges.map((change) => {
              const decrypted = decryptSecret(change.newValue);
              return {
                id: change.id,
                memberDisplayName: memberDisplayName(member),
                memberNumber: member.memberNumber,
                memberSlug: member.slug,
                displayValue: maskIban(
                  ibanFirst2(decrypted),
                  ibanLast4(decrypted),
                ),
                requestedAt: change.requestedAt.toISOString(),
                confirmed: true,
              };
            })}
          />
        )}

        {viewer.isAdmin && (
          <KalenderTokenSection
            memberId={member.id}
            hasToken={member.calendarTokenHash !== null}
            tokenCreatedAt={
              member.calendarTokenCreatedAt?.toISOString() ?? null
            }
          />
        )}

        {isSelf && <MeineKinderSection guardianChildren={myChildren} />}
        {!isSelf && (
          <ErziehungsberechtigteSection guardians={guardiansOfMember} />
        )}

        {canViewVereinsspiele && (
          <div className="md:col-span-2">
            <VereinsspieleSection
              holdings={holdings}
              viewerIsSubject={isSelf}
            />
          </div>
        )}

        {member.meeple && (
          <div className="md:col-span-2">
            <MeepleDatenSection
              // Kopie statt des Prisma-Objekts: die Result-Extension
              // (signierte URLs, #112) liefert einen Proxy mit
              // `nodejs.util.inspect.custom`-Symbol, den React nicht an
              // Client-Komponenten serialisieren kann. Ein Spread kopiert das
              // Symbol mit — `Object.entries` nimmt nur String-Keys.
              meeple={
                Object.fromEntries(
                  Object.entries(member.meeple),
                ) as typeof member.meeple
              }
              canEdit={isSelf || viewer.canManageMembers}
              showAddress={
                member.meeple.shareAddress || isSelf || viewer.canManageMembers
              }
            />
          </div>
        )}

        {/* Bewusst kein `col-span-*` — bleibt immer 1x1, nicht wie die
         * übrigen Listen-/Formular-lastigen Karten hier 2 Spalten breit. */}
        {ownPrivateCollection && member.meeple && (
          <PrivateCollectionCard
            bggUsername={member.meeple.bggUsername}
            entries={ownPrivateCollection.entries}
            cooldownEndsAt={ownPrivateCollection.cooldownEndsAt}
            canForceImport={ownPrivateCollection.canForceImport}
            visibleToOthers={member.meeple.privateCollectionVisible}
            importWantToPlay={member.meeple.importWantToPlay}
            shareForTrade={member.meeple.shareForTrade}
            nextEvent={ownPrivateCollection.nextEvent}
            ownOffers={ownPrivateCollection.ownOffers}
            latestImportJob={latestImportJob}
          />
        )}
        {/* Bewusst kein starrer `col-span-*` — nur Titel, ein Satz Text und
         * ein Link, keine Struktur, die bei 1 Spalte auseinanderfällt. Für
         * `!isSelf` (dieser Zweig hier) ist sie zudem immer die letzte
         * Grid-Karte im DOM (das `selfServiceData`-Fragment danach ist
         * `isSelf`-only, rendert hier also nie) — `md:last:col-span-full`
         * füllt deshalb die sonst leere Nachbarspalte, wenn sie allein in
         * der letzten Zeile landet (s. Datenschutz-Karte oben, gleiches
         * Prinzip). */}
        {!isSelf &&
          member.meeple?.privateCollectionVisible &&
          otherPrivateCount > 0 && (
            <div className="md:last:col-span-full">
              <PrivateSpieleSection meepleId={member.meeple.id} />
            </div>
          )}
        {member.meeple && (
          <WantToPlaySection meepleId={member.meeple.id} isOwner={isSelf} />
        )}
        {!isSelf && viewer.canManageMembers && member.meeple?.bggUsername && (
          <AdminBggImportCard
            meepleId={member.meeple.id}
            bggUsername={member.meeple.bggUsername}
            importedCount={otherPrivateCount}
            latestImportJob={latestImportJob}
          />
        )}

        {selfServiceData && (
          <>
            <EmailAddressSection
              email={member.email}
              openChange={
                selfServiceData.openEmailChange && {
                  newEmail: selfServiceData.openEmailChange.newValue,
                  requestedAt:
                    selfServiceData.openEmailChange.requestedAt.toISOString(),
                  confirmed:
                    selfServiceData.openEmailChange.confirmedAt !== null,
                }
              }
            />

            <PasswordChangeSection />

            {member.email && (
              <Card className="gap-4">
                <CardTitle>Newsletter</CardTitle>
                <NewsletterPreferencePanel
                  initialEnabled={selfServiceData.newsletterPreference.enabled}
                  initialCategories={
                    selfServiceData.newsletterPreference.categories
                  }
                />
              </Card>
            )}

            {/* Bewusst kein starrer `col-span-*` (im Gegensatz zu den
             * strukturierten Karten wie Stammdaten/Meeple-Daten mit fester
             * 2-Spalten-Feldtabelle) — nur Fließtext + 2 Buttons, keine
             * Struktur, die bei 1 Spalte Breite auseinanderfällt. Diese Karte
             * ist im DOM immer die letzte im Grid (letztes Kind des
             * `selfServiceData`-Fragments) — `md:last:col-span-full` nutzt
             * das: CSS Grid streckt ein Item nie von selbst auf leere
             * Nachbarspalten, nur `grid-column` legt die Breite fest, also
             * blieb die letzte Spalte neben ihr sonst einfach frei statt
             * gefüllt. */}
            <Card className="md:last:col-span-full">
              <CardTitle>Datenschutz</CardTitle>
              <DataExportPanel />
              <DeletionRequestPanel
                requestedAt={selfServiceData.deletionRequestedAt}
                openHoldings={selfServiceData.openHoldings}
              />
            </Card>
          </>
        )}
      </div>

      {/* Außerhalb des Grids statt `md:col-span-2`-Karte darin: `grid-flow-
       * dense` oben darf Karten zum Auffüllen von Lücken nach vorne ziehen —
       * diese Danger-Zone (Kündigung) soll dagegen garantiert immer als
       * letzter Block stehen, unabhängig von der Kartenkombination. */}
      {selfServiceData && (
        <Card variant="destructive">
          <CardTitle>Mitgliedschaft beenden</CardTitle>
          <ResignMembershipPanel
            resignedAt={member.resignedAt?.toISOString() ?? null}
            membershipEndsAt={member.membershipEndsAt?.toISOString() ?? null}
          />
        </Card>
      )}
    </PageContainer>
  );
}
