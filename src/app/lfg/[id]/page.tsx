import { notFound } from "next/navigation";
import { ProfilePictureVisibility } from "@prisma/client";
import {
  requireAdminPermission,
  hasPermissionInCurrentView,
} from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import {
  getLfgParticipantDisplayName,
  getLfgStatus,
  isLfgAttachmentEligible,
} from "@/lib/content/lfg";
import { getContactLinks, meepleEmail } from "@/lib/members/contact";
import { LfgDetailView } from "@/components/feature/lfg/lfg-detail-view";
import { formatDateMedium } from "@/lib/utils/format";

export default async function LfgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, meeple } = await requireAdminPermission("lfg:participate");
  const { id } = await params;

  const post = await prisma.lfgPost.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          meeple: {
            select: {
              displayName: true,
              member: { select: { email: true } },
              telegramHandle: true,
              signalHandle: true,
              discordHandle: true,
              address: true,
              shareAddress: true,
              profilePictureUrl: true,
              profilePictureVisibility: true,
            },
          },
          addedBy: { select: { displayName: true } },
        },
      },
      attachments: {
        include: { uploadedBy: { select: { displayName: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!post) notFound();

  const canManageMembers = await hasPermissionInCurrentView(
    user.id,
    "members:manage",
  );
  const isCreator = post.createdByMeepleId === meeple.id;
  // Kontaktdaten (#167) nur für beigetretene Betrachter — serverseitig
  // abgesichert, nicht nur clientseitig ausgeblendet: wer nicht beigetreten
  // ist, bekommt für jeden Teilnehmer `contact: null` mitgegeben. Ausnahme:
  // der Ersteller ist immer kontaktierbar, siehe unten bei `contact:`.
  const viewerIsParticipant = post.participants.some(
    (p) => p.meepleId === meeple.id,
  );
  // Ortsfeld editierbar (#166): Ersteller immer, beigetretene Teilnehmer nur
  // bei aktivem `participantsMayEditLocation` — analog `canAddGuest`.
  const canEditLocation =
    isCreator || (post.participantsMayEditLocation && viewerIsParticipant);
  // Datei-Bereich (#283) nur für Teilnehmer eines heute geplanten oder
  // abgelaufenen Gesuchs — `undefined` statt `[]` blendet den Bereich in
  // `LfgDetailView` komplett aus, statt ihn leer zu zeigen.
  const showAttachments = viewerIsParticipant && isLfgAttachmentEligible(post);

  return (
    <LfgDetailView
      id={post.id}
      title={post.title}
      gameTitle={post.gameTitle}
      dateLabel={
        post.plannedAt
          ? formatDateMedium(post.plannedAt)
          : (post.dateNote ?? "Termin offen")
      }
      location={post.location}
      description={post.description}
      status={getLfgStatus(post, post.participants.length)}
      maxParticipants={post.maxParticipants}
      participants={post.participants.map((p) => ({
        id: p.id,
        meepleId: p.meepleId,
        displayName: getLfgParticipantDisplayName({
          meepleId: p.meepleId,
          meepleDisplayName: p.meeple?.displayName,
          addedByDisplayName: p.addedBy.displayName,
        }),
        // Ersteller bleibt Ausnahme von #167: wer noch nicht beigetreten ist,
        // muss den Autor trotzdem kontaktieren können, um überhaupt fragen zu
        // können — für alle übrigen Teilnehmenden gilt die Sperre unverändert.
        contact:
          p.meepleId !== null &&
          p.meeple &&
          (viewerIsParticipant || p.meepleId === post.createdByMeepleId)
            ? getContactLinks({ ...p.meeple, email: meepleEmail(p.meeple) })
            : null,
        // (#412) Bild statt Initialen-Kreis, sofern hochgeladen und laut
        // Freigabe sichtbar — Betrachter ist hier immer "meeple" (LFG ist
        // ein reiner Mitglieder-Bereich, kein Gast-Kontext).
        profilePictureUrl: p.meeple?.profilePictureUrl ?? null,
        profilePictureVisibility:
          p.meeple?.profilePictureVisibility ?? ProfilePictureVisibility.INTERN,
        canRemove:
          p.meepleId === null && (p.addedByMeepleId === meeple.id || isCreator),
      }))}
      createdByMeepleId={post.createdByMeepleId}
      viewerMeepleId={meeple.id}
      canClose={isCreator || canManageMembers}
      guestsMayBringGuests={post.guestsMayBringGuests}
      canEditLocation={canEditLocation}
      viewerHasOwnAddress={Boolean(meeple.address)}
      attachments={
        showAttachments
          ? post.attachments.map((attachment) => ({
              id: attachment.id,
              url: attachment.url,
              filename: attachment.filename,
              uploadedByName: attachment.uploadedBy.displayName,
              canDelete:
                attachment.uploadedByMeepleId === meeple.id || isCreator,
            }))
          : undefined
      }
    />
  );
}
