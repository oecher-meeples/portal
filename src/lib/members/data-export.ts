import { prisma } from "@/lib/utils/prisma";

/**
 * Every model that stores data about a Meeple, whether via a `Meeple` relation
 * or via the login account (`neonAuthUserId`). `data-export.coverage.test.ts`
 * checks this list against prisma/schema.prisma, so a new meeple-related model
 * fails the build instead of silently producing an incomplete Art.-15 export.
 */
export const MEEPLE_RELATED_MODELS = [
  "Meeple",
  "Member",
  "BankDataAccessLog",
  "DeletionRequest",
  "ExplainerAttendance",
  "ExplainerGame",
  "FleaMarketItem",
  "GameHolding",
  "HelperAvailability",
  "Invite",
  "LfgParticipant",
  "LfgPost",
  "MarketListing",
  "NewsletterSubscriber",
  "PrivateGameCollectionEntry",
  "ShiftBooking",
  "SparePartListing",
  "StorageUnit",
  "StorageUnitMove",
  "UserRole",
] as const;

export type MeepleRelatedModel = (typeof MEEPLE_RELATED_MODELS)[number];

export type MeepleDataExport = {
  exportedAt: string;
  meepleId: string;
  hinweise: string[];
  daten: Record<MeepleRelatedModel, unknown>;
};

/**
 * The full IBAN is deliberately absent — an unencrypted export file holding it
 * would be a new problem rather than a solved one (see docs/adr/0003).
 */
const EXPORT_NOTES = [
  "Dieser Export enthält alle personenbezogenen Daten, die im Portal zu diesem Mitglied gespeichert sind (Art. 15 und Art. 20 DSGVO).",
  "Die vollständige IBAN ist bewusst nicht enthalten, sondern nur die letzten vier Stellen. Eine unverschlüsselte Exportdatei mit vollständiger IBAN wäre ein neues Datenschutzproblem. Für die vollständige Bankverbindung bitte an den Kassenwart wenden.",
  "Einträge, in denen dieses Mitglied nur als erfassende Person auftaucht (z. B. wer eine Ausleihe eingetragen hat), sind mit aufgeführt, weil sie Angaben über dieses Mitglied enthalten.",
];

export async function collectMeeplePersonalData(
  meepleId: string,
  now: Date = new Date(),
): Promise<MeepleDataExport | null> {
  const meeple = await prisma.meeple.findUnique({
    where: { id: meepleId },
    select: {
      id: true,
      memberNumber: true,
      displayName: true,
      joinedAt: true,
      anonymizedAt: true,
      bggUsername: true,
      bgaUsername: true,
      telegramHandle: true,
      signalHandle: true,
      discordHandle: true,
      address: true,
      shareAddress: true,
      doorbellNote: true,
      createdAt: true,
      updatedAt: true,
      neonAuthUserId: true,
    },
  });
  if (!meeple) return null;

  const { neonAuthUserId, ...meepleFields } = meeple;

  // Member (die Vereinsmitgliedschaft, seit #328 von Meeple getrennt) — die
  // volle IBAN bleibt aus demselben Grund draußen wie zuvor bei Meeple.
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: {
      id: true,
      memberNumber: true,
      lastName: true,
      firstName: true,
      birthDate: true,
      birthPlace: true,
      street: true,
      postalCode: true,
      city: true,
      phone: true,
      email: true,
      selbstgewaehlterBeitrag: true,
      ibanLast4: true,
      accountHolder: true,
      resignedAt: true,
      membershipEndsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const [
    bankDataAccessLogs,
    deletionRequests,
    explainerAttendances,
    explainerGames,
    fleaMarketItems,
    gameHoldings,
    helperAvailabilities,
    invites,
    lfgParticipations,
    lfgPosts,
    marketListings,
    newsletterSubscription,
    privateGameCollection,
    shiftBookings,
    sparePartListings,
    keptStorageUnits,
    storageUnitMoves,
    userRoles,
  ] = await Promise.all([
    prisma.bankDataAccessLog.findMany({
      where: {
        OR: [{ accessedByMeepleId: meepleId }, { subjectMeepleId: meepleId }],
      },
      orderBy: { at: "desc" },
    }),
    prisma.deletionRequest.findMany({
      where: { meepleId },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.explainerAttendance.findMany({
      where: { meepleId },
      include: { event: { select: { title: true, startsAt: true } } },
    }),
    prisma.explainerGame.findMany({
      where: { meepleId },
      include: { boardGame: { select: { title: true } } },
    }),
    prisma.fleaMarketItem.findMany({
      where: {
        OR: [{ sellerMeepleId: meepleId }, { approvedByMeepleId: meepleId }],
      },
      include: { event: { select: { title: true, startsAt: true } } },
    }),
    prisma.gameHolding.findMany({
      where: {
        OR: [
          ...(member ? [{ vereinsmitgliedId: member.id }] : []),
          { recordedByMeepleId: meepleId },
        ],
      },
      orderBy: { startedAt: "desc" },
      include: {
        gameCopy: { include: { boardGame: { select: { title: true } } } },
      },
    }),
    prisma.helperAvailability.findMany({
      where: { meepleId },
      include: {
        day: { select: { date: true, event: { select: { title: true } } } },
        roles: { include: { role: { select: { name: true } } } },
      },
    }),
    neonAuthUserId
      ? prisma.invite.findMany({ where: { createdByUserId: neonAuthUserId } })
      : [],
    prisma.lfgParticipant.findMany({
      where: { meepleId },
      include: { post: { select: { title: true, plannedAt: true } } },
    }),
    prisma.lfgPost.findMany({ where: { createdByMeepleId: meepleId } }),
    prisma.marketListing.findMany({ where: { sellerMeepleId: meepleId } }),
    prisma.newsletterSubscriber.findUnique({ where: { meepleId } }),
    prisma.privateGameCollectionEntry.findMany({
      where: { meepleId },
      include: { boardGame: { select: { title: true } } },
    }),
    prisma.shiftBooking.findMany({
      where: { meepleId },
      include: {
        shift: {
          select: {
            role: { select: { name: true } },
            targetStartsAt: true,
            targetEndsAt: true,
            event: { select: { title: true } },
          },
        },
      },
    }),
    prisma.sparePartListing.findMany({ where: { keeperMeepleId: meepleId } }),
    prisma.storageUnit.findMany({ where: { keeperMeepleId: meepleId } }),
    prisma.storageUnitMove.findMany({
      where: {
        OR: [{ keeperMeepleId: meepleId }, { recordedByMeepleId: meepleId }],
      },
      orderBy: { startedAt: "desc" },
    }),
    neonAuthUserId
      ? prisma.userRole.findMany({
          where: { neonAuthUserId },
          include: { role: { select: { name: true, description: true } } },
        })
      : [],
  ]);

  return {
    exportedAt: now.toISOString(),
    meepleId,
    hinweise: EXPORT_NOTES,
    daten: {
      Meeple: meepleFields,
      Member: member,
      BankDataAccessLog: bankDataAccessLogs,
      DeletionRequest: deletionRequests,
      ExplainerAttendance: explainerAttendances,
      ExplainerGame: explainerGames,
      FleaMarketItem: fleaMarketItems,
      GameHolding: gameHoldings,
      HelperAvailability: helperAvailabilities,
      Invite: invites,
      LfgParticipant: lfgParticipations,
      LfgPost: lfgPosts,
      MarketListing: marketListings,
      NewsletterSubscriber: newsletterSubscription,
      PrivateGameCollectionEntry: privateGameCollection,
      ShiftBooking: shiftBookings,
      SparePartListing: sparePartListings,
      StorageUnit: keptStorageUnits,
      StorageUnitMove: storageUnitMoves,
      UserRole: userRoles,
    },
  };
}
